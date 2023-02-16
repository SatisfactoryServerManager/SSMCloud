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
const UserInvite = require("../../models/user_invite");
const UserRole = require("../../models/user_role");
const Permission = require("../../models/permission");
const AgentSaveFile = require("../../models/agent_save");
const AgentBackup = require("../../models/agent_backup");
const ApiKey = require("../../models/apikey");
const ModModel = require("../../models/mod");
const AgentLogInfo = require("../../models/agent_log_info");

const NotificationEventTypeModel = require("../../models/notification_event_type");
const NotificationSettingsModel = require("../../models/account_notification_setting");

const AgentHandler = require("../../server/server_agent_handler");

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

        res.render("dashboard/servers", {
            path: "/servers",
            pageTitle: "Servers",
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            latestVersion: AgentHandler._LatestAgentRelease,
            errorMessage: "",
            newApiKey: "",
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
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
            newApiKey: "",
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
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("server.create");

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
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(422).render("dashboard/servers", {
                path: "/servers",
                pageTitle: "Servers",
                accountName: theAccount.accountName,
                agents: theAccount.agents,
                latestVersion: AgentHandler._LatestAgentRelease,
                errorMessage: errors.array()[0].msg,
                validationErrors: errors.array(),
                oldInput: {
                    inp_servername: req.body.inp_servername,
                    inp_serverport: req.body.inp_serverport,
                    inp_servermemory: req.body.inp_servermemory,
                },
            });
            return;
        }

        const existingAgentWithName = theAccount.agents.find(
            (agent) => agent.agentName == req.body.inp_servername
        );

        if (existingAgentWithName) {
            res.render("dashboard/servers", {
                path: "/servers",
                pageTitle: "Servers",
                accountName: "",
                agents: theAccount.agents,
                latestVersion: AgentHandler._LatestAgentRelease,
                oldInput: {
                    inp_servername: req.body.inp_servername,
                    inp_serverport: req.body.inp_serverport,
                    inp_servermemory: req.body.inp_servermemory,
                },
                errorMessage:
                    "Server with that name already exists on your account!",
                newApiKey: "",
            });
            return;
        }

        const APIKey =
            "AGT-API-" + Tools.generateUUID("XXXXXXXXXXXXXXXXXXXXXXX");

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

        res.render("dashboard/servers", {
            path: "/servers",
            pageTitle: "Servers",
            accountName: "",
            agents: theAccount.agents,
            latestVersion: AgentHandler._LatestAgentRelease,
            oldInput: {
                inp_servername: req.body.inp_servername,
                inp_serverport: req.body.inp_serverport,
                inp_servermemory: req.body.inp_servermemory,
            },
            errorMessage: "",
            newApiKey: APIKey,
        });
    } else {
        res.render("dashboard/servers", {
            path: "/servers",
            pageTitle: "Servers",
            accountName: "",
            agents: [],
            latestVersion: "",
            oldInput: {
                email: "",
                password: "",
            },
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
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

    const theAgent = theAccount.agents.find((agent) => agent._id == agentid);

    if (theAccount) {
        await theAccount.populate("agents");

        res.render("dashboard/server", {
            path: "/server",
            pageTitle: `Server - ${theAgent.agentName}`,
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            latestVersion: AgentHandler._LatestAgentRelease,
            agent: theAgent,
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

    const hasPermission = await theUser.HasPermission("server.delete");

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

    const agentIndex = theAccount.agents.indexOf(agentid);

    await theAccount.populate("agents");

    const theAgent = theAccount.agents.find((agent) => agent._id == agentid);

    if (theAgent) {
        try {
            await NotificationSystem.CreateNotification(
                "agent.deleted",
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
    }

    res.redirect("/dashboard/servers");
};
