import BackendAPI from "../../utils/backend-api.js";

export async function getServers(req, res, next) {
    const theAccount = await BackendAPI.GetAccount(req.session.token);

    if (theAccount) {
        const agents = await BackendAPI.GetAgents(req.session.token);

        let message = req.flash("success");
        message.length > 0 ? (message = message[0]) : (message = null);

        let errorMessage = req.flash("error");
        errorMessage.length > 0
            ? (errorMessage = errorMessage[0])
            : (errorMessage = null);

        res.render("dashboard/servers", {
            path: "/servers",
            pageTitle: "Servers",
            accountName: theAccount.accountName,
            agents,
            errorMessage,
            message,
            oldInput: {
                inp_servername: "",
                inp_serverport: "",
                inp_servermemory: "",
            },
        });
    } else {
        res.render("dashboard/servers", {
            path: "/servers",
            pageTitle: "Servers",
            accountName: "",
            agents: [],
            latestVersion: "",
            message,
            errorMessage,
            oldInput: {
                inp_servername: "",
                inp_serverport: "",
                inp_servermemory: "",
            },
        });
    }
}

export async function postServers(req, res, next) {
    const theAccount = await BackendAPI.GetAccount(req.session.token);

    if (theAccount == null) {
        return res.json({
            sucess: false,
            error: "Cant Find Session Account details!",
        });
    }

    const agents = await BackendAPI.GetAgents(req.session.token);

    const existingAgentWithName = agents.find(
        (agent) => agent.agentName == req.body.inp_servername
    );

    if (existingAgentWithName) {
        return res.json({
            sucess: false,
            error: "Server with the same name already exists on this Account!",
        });
    }

    req.body.serverPort = parseInt(req.body.serverPort);
    req.body.serverMemory = parseInt(req.body.serverMemory);
    delete req.body._csrf;

    let apiRes = {};

    try {
        apiRes = await BackendAPI.POST_APICall_Token(
            "/api/v1/account/agents",
            req.session.token,
            req.body
        );
    } catch (err) {
        return res.json({
            sucess: false,
            error: err.message,
        });
    }

    return res.json(apiRes);
}

export async function getServer(req, res, next) {
    const { agentid } = req.params;

    try {
        const theAccount = await BackendAPI.GetAccount(req.session.token);
        const agents = await BackendAPI.GetAgents(req.session.token);
        const theAgent = await BackendAPI.GetAgentById(
            req.session.token,
            agentid
        );

        const logs = await BackendAPI.GetAgentLogs(req.session.token, agentid);

        const mods = await BackendAPI.GetMods();

        if (theAgent) {
            let message = req.flash("success");
            message.length > 0 ? (message = message[0]) : (message = null);

            let errorMessage = req.flash("error");
            errorMessage.length > 0
                ? (errorMessage = errorMessage[0])
                : (errorMessage = null);

            res.render("dashboard/server", {
                path: "/server",
                pageTitle: `Server - ${theAgent.agentName}`,
                accountName: theAccount.accountName,
                agents: agents,
                agent: theAgent,
                apiKey: encodeBase64(theAgent.apiKey),
                errorMessage,
                message,
                mods,
                logs,
            });
        } else {
            res.render("dashboard/server", {
                path: "/serves",
                pageTitle: "Server",
                accountName: "",
                agents: [],
                agent: {},
                mods: [],
                logs: [],
                apiKey: "",
                errorMessage: JSON.stringify({
                    message:
                        "Cant Find Account details. Please contact SSM Support.",
                }),
            });
        }
    } catch (err) {
        res.render("dashboard/server", {
            path: "/serves",
            pageTitle: "Server",
            accountName: "",
            agents: [],
            agent: {
                config: { version: null },
            },
            mods: [],
            logs: [],
            apiKey: "",
            errorMessage: JSON.stringify({
                message: err.message,
            }),
        });
    }
}

export async function getServerJS(req, res, next) {
    const { agentid } = req.params;

    try {
        const theAgent = await BackendAPI.GetAgentById(
            req.session.token,
            agentid
        );

        if (!theAgent) {
            res.json({ success: false, error: "agent is null" });
            return;
        }

        res.json({
            agent: theAgent,
        });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
}

export async function postServer(req, res, next) {
    const data = req.body;

    const { agentid } = req.params;

    const successMessageData = {
        section: data._ConfigSetting,
        message: `Settings Have Been Successfully Updated!`,
    };

    const errorMessageData = {
        section: data._ConfigSetting,
        message: `Something Went Wrong!`,
    };

    try {
        const theAccount = await BackendAPI.GetAccount(req.session.token);
        const theAgent = await BackendAPI.GetAgentById(
            req.session.token,
            agentid
        );

        if (theAccount == null) {
            throw new Error("Account was null");
        }

        if (theAgent == null) {
            throw new Error("Agent was null");
        }

        if (data._ConfigSetting == "sfsettings") {
            theAgent.serverConfig.maxPlayers = parseInt(data.inp_maxplayers);

            theAgent.serverConfig.UpdateOnStart =
                data.inp_updatesfonstart == "on" ? true : false;

            theAgent.serverConfig.autoPause =
                data.inp_autoPause == "on" ? true : false;
            theAgent.serverConfig.autoSaveOnDisconnect =
                data.inp_autoSaveOnDisconnect == "on" ? true : false;

            theAgent.serverConfig.workerThreads = parseInt(
                data.inp_workerthreads
            );

            theAgent.serverConfig.branch =
                data.inp_sfbranch == "on" ? "experimental" : "public";

            theAgent.serverConfig.autoRestart =
                data.inp_autorestart == "on" ? true : false;

            theAgent.serverConfig.autoSaveInterval = parseFloat(
                data.inp_autoSaveInterval
            );

            theAgent.serverConfig.disableSeasonalEvents =
                data.inp_seasonalEvents == "on" ? false : true;
        } else if (data._ConfigSetting == "backupsettings") {
            theAgent.config.backupKeepAmount = parseInt(data.inp_backupkeep);
            theAgent.config.backupInterval = parseInt(data.inp_backupinterval);
        } else if (data._ConfigSetting == "modsettings") {
            const modState = theAgent.modConfig;

            const selectedMod = modState.selectedMods.find(
                (sm) => sm.mod.mod_reference == data.modReference
            );

            if (selectedMod == null) {
                const errorMessageData = {
                    section: "",
                    message:
                        "Error saving mod settings with error: Couldn't find selected mod",
                };

                req.flash("error", JSON.stringify(errorMessageData));
                return res.redirect(`/dashboard/servers/${agentid}`);
            }

            data.modConfig = JSON.parse(data.modConfig);
            data.modConfig = JSON.stringify(data.modConfig);

            const agentTask = {
                action: "updateModConfig",
                data,
            };
            await BackendAPI.CreateAgentTask(
                req.session.token,
                theAgent._id,
                agentTask
            );
        }

        if (data._ConfigSetting != "modsettings") {
            const agentTask = {
                action: "updateconfig",
                data,
            };

            await BackendAPI.CreateAgentTask(
                req.session.token,
                theAgent._id,
                agentTask
            );

            await BackendAPI.UpdateAgentConfig(req.session.token, theAgent);
        }

        req.flash("success", JSON.stringify(successMessageData));
        res.redirect(`/dashboard/servers/${agentid}`);
    } catch (err) {
        errorMessageData.message = err.message;

        req.flash("error", JSON.stringify(errorMessageData));
        res.redirect(`/dashboard/servers/${agentid}`);
    }
}

export async function getServerDelete(req, res, next) {
    const { agentid } = req.params;

    const successMessageData = {
        section: "serverlist",
        message: `Settings Have Been Successfully Updated!`,
    };

    const errorMessageData = {
        section: "serverlist",
        message: `Something Went Wrong!`,
    };

    try {
        const theAccount = await BackendAPI.GetAccount(req.session.token);
        const theAgent = await BackendAPI.GetAgentById(
            req.session.token,
            agentid
        );

        if (theAccount == null) {
            throw new Error("Account was null");
        }

        if (theAgent == null) {
            throw new Error("Agent was null");
        }

        await BackendAPI.DeleteAgent(req.session.token, agentid);

        req.flash("success", JSON.stringify(successMessageData));
        res.redirect(`/dashboard/servers`);
    } catch (err) {
        errorMessageData.message = err.message;

        req.flash("error", JSON.stringify(errorMessageData));
        res.redirect(`/dashboard/servers`);
    }
}

export async function getWorkflow(req, res, next) {
    try {
        const { workflowid } = req.params;
        const data = await BackendAPI.GetWorkflow(
            req.session.token,
            workflowid
        );

        return res.json(data);
    } catch (err) {
        return res.json({
            success: false,
            error: err.message,
        });
    }
}

const encodeBase64 = (data) => {
    return Buffer.from(data).toString("base64");
};
const decodeBase64 = (data) => {
    return Buffer.from(data, "base64").toString("ascii");
};
