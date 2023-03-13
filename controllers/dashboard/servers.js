var ObjectId = require("mongoose").Types.ObjectId;

const Mrhid6Utils = require("mrhid6utils");
const Tools = Mrhid6Utils.Tools;

const fs = require("fs-extra");
const path = require("path");

const Config = require("../../server/server_config");

const NotificationSystem = require("../../server/server_notification_system");

const Account = require("../../models/account");
const Agent = require("../../models/agent");
const MessageQueueItem = require("../../models/messagequeueitem");
const User = require("../../models/user");
const AgentSaveFile = require("../../models/agent_save");
const AgentBackup = require("../../models/agent_backup");
const AgentLogInfo = require("../../models/agent_log_info");

const AgentHandler = require("../../server/server_agent_handler");
const { validationResult } = require("express-validator");

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

    const newAgent = await Agent.create({
        agentName: req.body.inp_servername,
        sfPortNum: req.body.inp_serverport,
        apiKey: APIKey,
        memory: req.body.inp_servermemory * 1024 * 1024 * 1024,
        logInfo: newLogInfo,
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

        res.render("dashboard/server", {
            path: "/server",
            pageTitle: `Server - ${theAgent.agentName}`,
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            latestVersion: AgentHandler._LatestAgentRelease,
            agent: theAgent,
            apiKey: encodeBase64(theAgent.apiKey),
            errorMessage: "",
        });
    } else {
        res.render("dashboard/server", {
            path: "/serves",
            pageTitle: "Server",
            accountName: "",
            agents: [],
            latestVersion: "",
            agent: {},
            apiKey: "",
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
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

    const theAgent = await Agent.findOne({ _id: agentid }).select(
        "+messageQueue"
    );

    if (theAccount) {
        await theAccount.populate("agents");

        res.render("dashboard/server", {
            path: "/server",
            pageTitle: `Server - ${theAgent.agentName}`,
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            agent: theAgent,
            errorMessage: "",
        });
    } else {
        res.render("dashboard/server", {
            path: "/serves",
            pageTitle: "Server",
            accountName: "",
            agents: [],
            agent: {},
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }

    const message = await MessageQueueItem.create({
        action: "updateconfig",
        data,
    });

    theAgent.messageQueue.push(message);
    await theAgent.save();
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

    const agentIndex = theAccount.agents.indexOf(agentid);

    await theAccount.populate("agents");

    const theAgent = theAccount.agents.find((agent) => agent._id == agentid);

    if (theAgent) {
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

        await AgentLogInfo.deleteOne({ _id: theAgent.logInfo });
        await AgentSaveFile.deleteMany({ _id: { $in: theAgent.saves } });
        await AgentBackup.deleteMany({ _id: { $in: theAgent.backups } });

        await Agent.deleteOne({ _id: theAgent._id });
        theAccount.agents.splice(agentIndex, 1);
        await theAccount.save();

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
