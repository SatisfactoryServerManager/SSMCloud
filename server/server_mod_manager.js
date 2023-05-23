const { request } = require("graphql-request");

const ModModel = require("../models/mod");
const AgentModStateModel = require("../models/agent_mod_state.model");
const AgentModel = require("../models/agent");
const Account = require("../models/account");

const semver = require("semver");

const Config = require("./server_config");

class ModManager {
    constructor() {}

    init = async () => {
        this.FicsitApiURL = Config.get("ssm.mods.api");
        this.FicsitQueryURL = `${this.FicsitApiURL}/v2/query`;

        await this.CheckAgentsModStates();
        await this.UpdateModsInDB();

        setInterval(async () => {
            await this.CheckAgentsModStates();
        }, 5 * 60 * 1000);
    };

    GetModCountFromAPI = async () => {
        const query = ` {
            getMods(filter: {
                hidden: true
            }) {
                count
            }
        }
        `;
        try {
            const res = await request(this.FicsitQueryURL, query);
            return res.getMods.count;
        } catch (err) {
            console.log(err);
        }
    };

    GetSMLVersionsFromAPI = async () => {
        const query = ` {
            getSMLVersions{
              sml_versions{
                id
                version
                link
              }
            }
          }`;
        try {
            const result = await request(this.FicsitQueryURL, query);

            return result.getSMLVersions.sml_versions;
        } catch (err) {
            //console.log(err);
            return [
                {
                    id: "CKG78K6qYrKHaQ",
                    version: "3.4.1",
                    link: "https://github.com/satisfactorymodding/SatisfactoryModLoader/releases/tag/v3.4.1",
                },
            ];
        }
    };

    GetModListFromAPI = async () => {
        if (Config.get("ssm.mods.useexp")) {
            return await this.GetModListFromAPIEXP();
        }

        const count = await this.GetModCountFromAPI();

        const ModList = [];
        for (let i = 0; i < count / 100; i++) {
            const query = ` {
                getMods(filter: {
                    limit: 100,
                    offset: ${i * 100},
                    hidden: true
                }) {
                    mods {
                        id,
                        name,
                        hidden,
                        logo,
                        mod_reference,
                        versions {
                            version,
                            link,
                            arch {
                                platform
                                asset
                              },
                            sml_version,
                            dependencies {
                                mod_id
                                condition
                            }
                        }
                    }
                }
            }
            `;

            try {
                const modsRes = await request(this.FicsitQueryURL, query);
                const mods = modsRes.getMods.mods;
                for (let i = 0; i < mods.length; i++) {
                    const mod = mods[i];
                    if (mod.versions.length == 0) continue;

                    const versionsFilter = mod.versions.filter((v) => {
                        if (v.arch != null) {
                            const linuxArch = v.arch.find(
                                (a) => a.platform == "LinuxServer"
                            );
                            const windowsArch = v.arch.find(
                                (a) => a.platform == "WindowsServer"
                            );
                            return linuxArch != null || windowsArch != null;
                        }
                        return false;
                    });
                    if (versionsFilter.length > 0) {
                        mod.versions = versionsFilter;
                        ModList.push(mod);
                    }
                }
            } catch (err) {
                console.log(err);
            }
        }

        return ModList;
    };

    GetModListFromAPIEXP = async () => {
        const count = await this.GetModCountFromAPI();

        const ModList = [];
        for (let i = 0; i < count / 100; i++) {
            const query = ` {
                getMods(filter: {
                    limit: 100,
                    offset: ${i * 100},
                    hidden: true
                }) {
                    mods {
                        id,
                        name,
                        hidden,
                        logo,
                        mod_reference,
                        versions {
                            version,
                            link,
                            targets {
                                targetName
                                link
                              },
                            sml_version,
                            dependencies {
                                mod_id
                                condition
                            }
                        }
                    }
                }
            }
            `;

            try {
                const modsRes = await request(this.FicsitQueryURL, query);
                const mods = modsRes.getMods.mods;
                for (let i = 0; i < mods.length; i++) {
                    const mod = mods[i];
                    if (mod.versions.length == 0) continue;

                    const versionsFilter = mod.versions.filter((v) => {
                        if (v.targets != null) {
                            const linuxArch = v.targets.find(
                                (a) => a.targetName == "LinuxServer"
                            );
                            const windowsArch = v.targets.find(
                                (a) => a.targetName == "WindowsServer"
                            );
                            return linuxArch != null || windowsArch != null;
                        }
                        return false;
                    });
                    if (versionsFilter.length > 0) {
                        mod.versions = versionsFilter;
                        ModList.push(mod);
                    }
                }
            } catch (err) {
                console.log(err);
            }
        }

        return ModList;
    };

    UpdateModsInDB = async () => {
        const ModList = await this.GetModListFromAPI();

        for (let i = 0; i < ModList.length; i++) {
            const mod = ModList[i];

            const existingMod = await ModModel.findOne({ modId: mod.id });

            if (existingMod) {
                existingMod.modName = mod.name;
                existingMod.hidden = mod.hidden;
                existingMod.versions = mod.versions;
                await existingMod.save();
                return;
            }

            await ModModel.create({
                modId: mod.id,
                modName: mod.name,
                modReference: mod.mod_reference,
                hidden: mod.hidden,
                logoUrl: mod.logo,
                versions: mod.versions,
            });
        }
    };

    CheckAgentModState = async (ModState) => {
        for (let i = 0; i < ModState.selectedMods.length; i++) {
            const selectedMod = ModState.selectedMods[i];
            await ModState.populate(`selectedMods.${i}.mod`);

            const installedVersion = selectedMod.installedVersion;
            let NeedsUpdate = false;
            for (let j = 0; j < selectedMod.mod.versions.length; j++) {
                const modVersion = selectedMod.mod.versions[j];

                if (semver.lt(installedVersion, modVersion.version)) {
                    NeedsUpdate = true;
                }
            }

            selectedMod.needsUpdate = NeedsUpdate;
        }

        await ModState.save();
    };

    CheckAgentsModStates = async () => {
        const modStates = await AgentModStateModel.find();

        for (let i = 0; i < modStates.length; i++) {
            const modState = modStates[i];

            if (modState.selectedMods.length > 0) {
                this.CheckAgentModState(modState);
            }
        }

        return;

        const mods = await AgentModModel.find({});

        for (let i = 0; i < mods.length; i++) {
            const mod = mods[i];
            await mod.populate("mod");

            let satifiesAllVersions = true;

            if (mod.mod.versions.length == 0) {
                continue;
            }

            for (let j = 0; j < mod.mod.versions.length; j++) {
                const modVersion = mod.mod.versions[j];

                if (semver.lt(mod.version, modVersion.version)) {
                    satifiesAllVersions = false;
                }
            }

            const prevNeedUpdate = mod.needsUpdate;
            if (satifiesAllVersions == false) {
                mod.needsUpdate = true;
            } else {
                mod.needsUpdate = false;
            }

            if (prevNeedUpdate != mod.needsUpdate) {
                const theAgent = await AgentModel.findOne({
                    installedMods: mod,
                });
                if (theAgent) {
                    const theAccount = await Account.findOne({
                        agents: theAgent,
                    });
                    if (theAccount) {
                        await theAccount.CreateEvent(
                            "AGENT",
                            `Mod (${mod.mod.modName}) requires updating on Agent: ${theAgent.agentName}. Current Version: ${mod.version}, Latest Version: ${mod.mod.versions[0].version}`,
                            5
                        );
                    }
                }

                await mod.save();
            }
        }
    };
}

const modManager = new ModManager();
module.exports = modManager;
