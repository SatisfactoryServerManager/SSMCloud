const { request } = require("graphql-request");

const ModModel = require("../models/mod");
const AgentModStateModel = require("../models/agent_mod_state.model");
const AgentModel = require("../models/agent");
const Account = require("../models/account");

const semver = require("semver");

const Logger = require("./server_logger");

const Config = require("./server_config");

class ModManager {
    constructor() {}

    init = async () => {
        this.FicsitApiURL = Config.get("ssm.mods.api");
        this.FicsitQueryURL = `${this.FicsitApiURL}/v2/query`;

        await this.CheckAgentsModStates();

        setInterval(async () => {
            await this.CheckAgentsModStates();
        }, 5 * 60 * 1000);
    };

    CheckAgentModState = async (ModState) => {
        for (let i = 0; i < ModState.selectedMods.length; i++) {
            const selectedMod = ModState.selectedMods[i];
            await ModState.populate(`selectedMods.${i}.mod`);

            const installedVersion = semver.clean(selectedMod.installedVersion);
            let NeedsUpdate = false;

            if (selectedMod.mod == null) {
                continue;
            }

            for (let j = 0; j < selectedMod.mod.versions.length; j++) {
                const modVersion = selectedMod.mod.versions[j];

                if (
                    semver.lt(
                        installedVersion,
                        semver.clean(modVersion.version)
                    ) &&
                    semver.lt(
                        semver.clean(selectedMod.desiredVersion),
                        semver.clean(modVersion.version)
                    )
                ) {
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
    };
}

const modManager = new ModManager();
module.exports = modManager;
