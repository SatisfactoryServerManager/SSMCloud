const { request } = require("graphql-request");

const ModModel = require("../models/mod");

class ModManager {
    constructor() {
        this.FicsitApiURL = "https://api.ficsit.app";
        this.FicsitQueryURL = `${this.FicsitApiURL}/v2/query`;
    }

    init = async () => {
        await this.UpdateModsInDB();
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

    GetModListFromAPI = async () => {
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
                            sml_version,
                            dependencies {
                                mod_id
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
                    ModList.push(mod);
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
}

const modManager = new ModManager();
module.exports = modManager;
