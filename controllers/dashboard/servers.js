var ObjectId = require("mongoose").Types.ObjectId;

const Mrhid6Utils = require("mrhid6utils");
const Tools = Mrhid6Utils.Tools;

const fs = require("fs-extra");
const path = require("path");

const Config = require("../../server/server_config");
const rimraf = require("rimraf");

const NotificationSystem = require("../../server/server_notification_system");

const Account = require("../../models/account");
const Agent = require("../../models/agent");
const MessageQueueItem = require("../../models/messagequeueitem");
const User = require("../../models/user");
const AgentSaveFile = require("../../models/agent_save");
const AgentBackup = require("../../models/agent_backup");
const AgentLogInfo = require("../../models/agent_log_info");

const ModModel = require("../../models/mod");

const AgentHandler = require("../../server/server_agent_handler");
const { validationResult } = require("express-validator");
const AgentModStateModel = require("../../models/agent_mod_state.model");

exports.getServers = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("page.servers");

    if (!hasPermission) {
        res.status(403).render("403", {
            path: "/dashboard",
            pageTitle: "Dashboard",
            accountName: "",
            agents: [],
            errorMessage: "You dont have permission to view this page.",
        });
        return;
    }

    const theAccount = await Account.findOne({ users: req.session.user._id });
    if (theAccount) {
        await theAccount.populate("agents");

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
            agents: theAccount.agents,
            latestVersion: AgentHandler._LatestAgentRelease,
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
};

exports.postServers = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const errorMessageData = {
            section: "servers",
            message: "Invalid Session User ID Format",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/servers");
    }

    const theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("server.create");

    if (!hasPermission) {
        const errorMessageData = {
            section: "servers",
            message: "You dont have permission to perform this action!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/servers");
    }

    const theAccount = await Account.findOne({ users: req.session.user._id });

    if (theAccount == null) {
        const errorMessageData = {
            section: "servers",
            message: "Cant Find Session Account details!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/servers");
    }

    await theAccount.populate("agents");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessageData = {
            section: "servers",
            message: errors.array()[0].msg,
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/servers");
    }

    const existingAgentWithName = theAccount.agents.find(
        (agent) => agent.agentName == req.body.inp_servername
    );

    if (existingAgentWithName) {
        const errorMessageData = {
            section: "servers",
            message:
                "Server with the same name already exists on this Account!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/servers");
    }

    const APIKey = "AGT-API-" + Tools.generateUUID("XXXXXXXXXXXXXXXXXXXXXXX");

    const newLogInfo = await AgentLogInfo.create({});
    const newModState = await AgentModStateModel.create({});

    const newAgent = await Agent.create({
        agentName: req.body.inp_servername,
        sfPortNum: req.body.inp_serverport,
        apiKey: APIKey,
        memory: req.body.inp_servermemory * 1024 * 1024 * 1024,
        logInfo: newLogInfo,
        modState: newModState,
    });
    theAccount.agents.push(newAgent);
    await theAccount.save();

    try {
        await NotificationSystem.CreateNotification(
            "agent.created",
            {
                account_id: theAccount._id,
                account_name: theAccount.accountName,
                agent_id: newAgent._id,
                agent_name: newAgent.agentName,
                server_port: newAgent.sfPortNum,
                memory: newAgent.memory,
            },
            theAccount._id
        );
    } catch (err) {
        console.log(err);
    }

    const successMessageData = {
        section: "servers",
        message: `New server has been created successfully. New Server API Key: ${APIKey}`,
    };

    req.flash("success", JSON.stringify(successMessageData));
    return res.redirect("/dashboard/servers");
};

exports.getServer = async (req, res, next) => {
    const { agentid } = req.params;

    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    if (!ObjectId.isValid(agentid)) {
        const error = new Error("Invalid Agent ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("page.server");

    if (!hasPermission) {
        res.status(403).render("403", {
            path: "/dashboard",
            pageTitle: "Dashboard",
            accountName: "",
            agents: [],
            errorMessage: "You dont have permission to view this page.",
        });
        return;
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
        agents: agentid,
    });

    if (theAccount == null) {
        const error = new Error("Cant Find Account details!");
        error.httpStatusCode = 500;
        return next(error);
    }

    await theAccount.populate("agents");

    let theAgent = theAccount.agents.find((agent) => agent._id == agentid);

    if (theAgent) {
        theAgent = await Agent.findOne({ _id: agentid }).select("+apiKey");

        await theAgent.populate("players");
        await theAgent.populate("logInfo");
        await theAgent.populate("modState");
        await theAgent.populate("saves");
        await theAgent.populate("backups");

        let message = req.flash("success");
        message.length > 0 ? (message = message[0]) : (message = null);

        let errorMessage = req.flash("error");
        errorMessage.length > 0
            ? (errorMessage = errorMessage[0])
            : (errorMessage = null);
        const mods = await ModModel.find().sort({ modName: 1 });
        res.render("dashboard/server", {
            path: "/server",
            pageTitle: `Server - ${theAgent.agentName}`,
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            latestVersion: AgentHandler._LatestAgentRelease,
            agent: theAgent,
            apiKey: encodeBase64(theAgent.apiKey),
            errorMessage,
            message,
            mods,
        });
    } else {
        res.render("dashboard/server", {
            path: "/serves",
            pageTitle: "Server",
            accountName: "",
            agents: [],
            latestVersion: "",
            agent: {},
            mods: [],
            apiKey: "",
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};

exports.getServerJS = async (req, res, next) => {
    const { agentid } = req.params;

    if (!ObjectId.isValid(req.session.user._id)) {
        res.json({ success: false, error: "invalid user id" });
        return;
    }

    if (!ObjectId.isValid(agentid)) {
        res.json({ success: false, error: "invalid agent id" });
        return;
    }

    const theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("page.server");

    if (!hasPermission) {
        res.json({ success: false, error: "permission denied" }).status(403);
        return;
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
        agents: agentid,
    });

    if (theAccount == null) {
        res.json({ success: false, error: "account is null" });
        return;
    }

    await theAccount.populate("agents");

    let theAgent = theAccount.agents.find((agent) => agent._id == agentid);

    if (theAgent) {
        theAgent = await Agent.findOne({ _id: agentid }).select("+apiKey");

        await theAgent.populate("players");

        res.json({
            agent: theAgent,
        });
    } else {
        res.json({ success: false, error: "agent is null" });
    }
};

exports.postServer = async (req, res, next) => {
    const data = req.body;

    const { agentid } = req.params;

    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    if (!ObjectId.isValid(agentid)) {
        const error = new Error("Invalid Agent ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("server.update");

    if (!hasPermission) {
        const errorMessageData = {
            section: "",
            message: "You dont have permission to perform this action!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect(`/dashboard/servers/${agentid}`);
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
        agents: agentid,
    });

    if (theAccount == null) {
        const error = new Error("Cant Find Account details!");
        error.httpStatusCode = 500;
        return next(error);
    }

    await theAccount.populate("agents");

    const theAgent = await Agent.findOne({ _id: agentid }).select(
        "+messageQueue"
    );

    if (theAgent == null) {
        const error = new Error("Cant Find Account details!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const successMessageData = {
        section: data._ConfigSetting,
        message: `Settings Have Been Successfully Updated!`,
    };

    if (data._ConfigSetting == "sfsettings") {
        theAgent.config.maxPlayers = parseInt(data.inp_maxplayers);

        theAgent.config.checkForUpdatesOnStart =
            data.inp_updatesfonstart == "on" ? true : false;

        theAgent.config.workerThreads = parseInt(data.inp_workerthreads);

        theAgent.config.sfBranch =
            data.inp_sfbranch == "on" ? "experimental" : "public";
    }

    if (data._ConfigSetting == "backupsettings") {
        theAgent.config.backup.keep = parseInt(data.inp_backupkeep);

        theAgent.config.backup.interval = parseInt(data.inp_backupinterval);
    }

    theAgent.markModified("config");

    const message = await MessageQueueItem.create({
        action: "updateconfig",
        data,
    });

    theAgent.messageQueue.push(message);
    await theAgent.save();

    req.flash("success", JSON.stringify(successMessageData));
    res.redirect(`/dashboard/servers/${agentid}`);
};

exports.getServerDelete = async (req, res, next) => {
    const { agentid } = req.params;

    if (!ObjectId.isValid(req.session.user._id)) {
        const errorMessageData = {
            section: "serverlist",
            message: "Invalid Session User ID Format",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/servers");
    }

    if (!ObjectId.isValid(agentid)) {
        const errorMessageData = {
            section: "serverlist",
            message: "Invalid Requested Server ID Format",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/servers");
    }

    const theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("server.delete");

    if (!hasPermission) {
        const errorMessageData = {
            section: "serverlist",
            message: "You dont have permission to perform this action!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/servers");
    }
    const theAccount = await Account.findOne({
        users: req.session.user._id,
        agents: agentid,
    });

    if (theAccount == null) {
        const errorMessageData = {
            section: "serverlist",
            message: "Cant Find Session Account details!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/servers");
    }

    let agentIndex = -1;

    for (let i = 0; i < theAccount.agents.length; i++) {
        const agent = theAccount.agents[i];
        if (agent._id.toString() == agentid) {
            agentIndex = i;
            break;
        }
    }

    await theAccount.populate("agents");

    const theAgent = theAccount.agents.find((agent) => agent._id == agentid);

    if (theAgent) {
        theAccount.agents.splice(agentIndex, 1);
        await theAccount.save();

        await AgentLogInfo.deleteOne({ _id: theAgent.logInfo });
        await AgentSaveFile.deleteMany({ _id: { $in: theAgent.saves } });
        await AgentBackup.deleteMany({ _id: { $in: theAgent.backups } });
        await AgentModStateModel.deleteOne({ _id: theAgent.modState });

        await Agent.deleteOne({ _id: theAgent._id });

        const agentUploadDir = path.join(
            Config.get("ssm.uploadsdir"),
            theAgent._id.toString()
        );

        if (fs.existsSync(agentUploadDir)) {
            rimraf.sync(agentUploadDir);
        }

        try {
            await NotificationSystem.CreateNotification(
                "agent.delete",
                {
                    account_id: theAccount._id,
                    account_name: theAccount.accountName,
                    agent_id: theAgent._id,
                    agent_name: theAgent.agentName,
                },
                theAccount._id
            );
        } catch (err) {
            console.log(err);
        }

        const successMessageData = {
            section: "serverlist",
            message: `Server has been deleted successfully!`,
        };

        req.flash("success", JSON.stringify(successMessageData));
        return res.redirect("/dashboard/servers");
    }

    res.redirect("/dashboard/servers");
};

const encodeBase64 = (data) => {
    return Buffer.from(data).toString("base64");
};
const decodeBase64 = (data) => {
    return Buffer.from(data, "base64").toString("ascii");
};
