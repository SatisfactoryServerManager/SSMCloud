var ObjectId = require("mongoose").Types.ObjectId;

const Mrhid6Utils = require("mrhid6utils");
const Tools = Mrhid6Utils.Tools;

const fs = require("fs-extra");
const path = require("path");

const Config = require("../server/server_config");

const { validationResult } = require("express-validator");

const Account = require("../models/account");
const Agent = require("../models/agent");
const MessageQueueItem = require("../models/messagequeueitem");
const User = require("../models/user");
const UserInvite = require("../models/user_invite");
const UserRole = require("../models/user_role");
const Permission = require("../models/permission");
const AgentSaveFile = require("../models/agent_save");
const ApiKey = require("../models/apikey");
const ModModel = require("../models/mod");

exports.getDashboard = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({ users: req.session.user._id });
    if (theAccount) {
        await theAccount.populate("agents");

        res.render("dashboard/dashboard", {
            path: "/dashboard",
            pageTitle: "Dashboard",
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            errorMessage: "",
        });
    } else {
        res.render("dashboard/dashboard", {
            path: "/dashboard",
            pageTitle: "Dashboard",
            accountName: "",
            agents: [],
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};

exports.getServerAction = async (req, res, next) => {
    const { agentid, action } = req.params;

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

    if (
        action != "start" &&
        action != "stop" &&
        action != "kill" &&
        action != "install" &&
        action != "update"
    ) {
        const error = new Error("Unknown Server Action!");
        error.httpStatusCode = 500;
        return next(error);
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

    let actionString = "";

    switch (action) {
        case "start":
            actionString = "startsfserver";
            break;
        case "stop":
            actionString = "stopsfserver";
            break;
        case "kill":
            actionString = "killsfserver";
            break;
        case "install":
            actionString = "installsfserver";
            break;
        case "update":
            actionString = "updatesfserver";
            break;
    }

    const message = await MessageQueueItem.create({ action: actionString });
    theAgent.messageQueue.push(message);
    await theAgent.save();

    res.redirect("/dashboard");
};

exports.getServers = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({ users: req.session.user._id });
    if (theAccount) {
        await theAccount.populate("agents");

        res.render("dashboard/servers", {
            path: "/servers",
            pageTitle: "Servers",
            accountName: theAccount.accountName,
            agents: theAccount.agents,
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

        const newAgent = await Agent.create({
            agentName: req.body.inp_servername,
            sfPortNum: req.body.inp_serverport,
            apiKey: APIKey,
            memory: req.body.inp_servermemory * 1024 * 1024 * 1024,
        });
        theAccount.agents.push(newAgent);
        await theAccount.save();

        res.render("dashboard/servers", {
            path: "/servers",
            pageTitle: "Servers",
            accountName: "",
            agents: theAccount.agents,
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

exports.getBackups = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({ users: req.session.user._id });
    if (theAccount) {
        await theAccount.populate("agents");
        for (let i = 0; i < theAccount.agents.length; i++) {
            const agent = theAccount.agents[i];
            await agent.populate("backups");
        }

        res.render("dashboard/backups", {
            path: "/backups",
            pageTitle: "Backups",
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            errorMessage: "",
            newApiKey: "",
            oldInput: {
                inp_servername: "",
                inp_serverport: "",
                inp_servermemory: "",
            },
        });
    } else {
        res.render("dashboard/backups", {
            path: "/backups",
            pageTitle: "Backups",
            accountName: "",
            agents: [],
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};

exports.getDownloadBackup = async (req, res, next) => {
    const backupId = req.params.backupId;

    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    if (!ObjectId.isValid(backupId)) {
        const error = new Error("Invalid Backup ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({ users: req.session.user._id });

    if (theAccount == null) {
        const error = new Error("Cant Find Account details!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const agents = await Agent.find({ _id: { $in: theAccount.agents } });
    let FoundAgent = null;
    for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        if (agent.backups.includes(backupId)) {
            FoundAgent = agent;
            break;
        }
    }
    if (FoundAgent == null) {
        const error = new Error("Cant Find Agent");
        error.httpStatusCode = 500;
        return next(error);
    }
    await FoundAgent.populate("backups");

    const backup = FoundAgent.backups.find((b) => b._id == backupId);

    if (backup == null) {
        const error = new Error("Cant Find Backup");
        error.httpStatusCode = 500;
        return next(error);
    }

    res.download(backup.fileName);
};

exports.getAccount = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const protocol = req.protocol;
    const host = req.hostname;

    const theAccount = await Account.findOne({ users: req.session.user._id });
    if (theAccount) {
        await theAccount.populate("userRoles");
        await theAccount.populate("users");
        await theAccount.populate("userInvites");
        await theAccount.populate("apiKeys");

        const AllPermissions = await Permission.find();

        for (let i = 0; i < theAccount.users.length; i++) {
            const user = theAccount.users[i];
            await user.populate("role");
        }

        for (let i = 0; i < theAccount.userInvites.length; i++) {
            const userInvite = theAccount.userInvites[i];
            await userInvite.populate("user");
        }

        for (let i = 0; i < theAccount.apiKeys.length; i++) {
            const key = theAccount.apiKeys[i];
            await key.populate("user");
        }

        res.render("dashboard/account", {
            path: "/account",
            pageTitle: "Account",
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            users: theAccount.users,
            userRoles: theAccount.userRoles,
            userInvites: theAccount.userInvites,
            apiKeys: theAccount.apiKeys,
            permissions: AllPermissions,
            inviteUrl: `${protocol}://${host}/acceptinvite`,
            inviteErrorMessage: null,
            userErrorMessage: null,
            apikeyErrorMessage: null,
            apikeySuccessMessage: null,
            errorMessage: "",
        });
    } else {
        res.render("dashboard/account", {
            path: "/account",
            pageTitle: "Account",
            accountName: "",
            agents: [],
            users: [],
            userRoles: [],
            permissions: [],
            userInvites: [],
            apiKeys: [],
            inviteUrl: `${protocol}://${host}/acceptinvite`,
            inviteErrorMessage: null,
            userErrorMessage: null,
            apikeyErrorMessage: null,
            apikeySuccessMessage: null,
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};

exports.postAccountUser = async (req, res, next) => {
    const protocol = req.protocol;
    const host = req.hostname;

    const data = req.body;

    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
    });

    if (theAccount == null) {
        const error = new Error("Cant Find Account details!");
        error.httpStatusCode = 500;
        return next(error);
    }

    await theAccount.populate("userRoles");
    await theAccount.populate("users");
    await theAccount.populate("userInvites");
    await theAccount.populate("apiKeys");

    const AllPermissions = await Permission.find();

    for (let i = 0; i < theAccount.users.length; i++) {
        const user = theAccount.users[i];
        await user.populate("role");
    }

    for (let i = 0; i < theAccount.userInvites.length; i++) {
        const userInvite = theAccount.userInvites[i];
        await userInvite.populate("user");
    }

    for (let i = 0; i < theAccount.apiKeys.length; i++) {
        const key = theAccount.apiKeys[i];
        await key.populate("user");
    }

    const resData = {
        path: "/account",
        pageTitle: "Account",
        accountName: theAccount.accountName,
        agents: theAccount.agents,
        users: theAccount.users,
        userRoles: theAccount.userRoles,
        userInvites: theAccount.userInvites,
        apiKeys: theAccount.apiKeys,
        permissions: AllPermissions,
        inviteUrl: `${protocol}://${host}/acceptinvite`,
        inviteErrorMessage: null,
        userErrorMessage: null,
        apikeyErrorMessage: null,
        errorMessage: "",
        successMessage: null,
    };

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        resData.userErrorMessage = errors.array()[0].msg;
        return res.status(422).render("dashboard/account", resData);
    }

    const newUser = await User.create({
        email: data.inp_useremail,
        password: "TempPaSS!",
        role: data.inp_userrole,
    });
    theAccount.users.push(newUser);

    const newInvite = await UserInvite.create({ user: newUser });
    theAccount.userInvites.push(newInvite);

    await theAccount.save();
    resData.successMessage = "User Invite Successfully Created!";
    return res.redirect("/dashboard/account");
};

exports.postAccountApiKey = async (req, res, next) => {
    const protocol = req.protocol;
    const host = req.hostname;

    const data = req.body;

    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
    });

    if (theAccount == null) {
        const error = new Error("Cant Find Account details!");
        error.httpStatusCode = 500;
        return next(error);
    }

    await theAccount.populate("userRoles");
    await theAccount.populate("users");
    await theAccount.populate("userInvites");
    await theAccount.populate("apiKeys");

    const AllPermissions = await Permission.find();

    for (let i = 0; i < theAccount.users.length; i++) {
        const user = theAccount.users[i];
        await user.populate("role");
    }

    for (let i = 0; i < theAccount.userInvites.length; i++) {
        const userInvite = theAccount.userInvites[i];
        await userInvite.populate("user");
    }

    for (let i = 0; i < theAccount.apiKeys.length; i++) {
        const key = theAccount.apiKeys[i];
        await key.populate("user");
    }

    const resData = {
        path: "/account",
        pageTitle: "Account",
        accountName: theAccount.accountName,
        agents: theAccount.agents,
        users: theAccount.users,
        userRoles: theAccount.userRoles,
        userInvites: theAccount.userInvites,
        apiKeys: theAccount.apiKeys,
        permissions: AllPermissions,
        inviteUrl: `${protocol}://${host}/acceptinvite`,
        inviteErrorMessage: null,
        userErrorMessage: null,
        apikeyErrorMessage: null,
        apikeySuccessMessage: null,
        errorMessage: "",
        successMessage: null,
    };

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        resData.apikeyErrorMessage = errors.array()[0].msg;
        return res.status(422).render("dashboard/account", resData);
    }

    let theUser = null;

    for (let i = 0; i < theAccount.users.length; i++) {
        const user = theAccount.users[i];
        if (user._id == data.inp_user) {
            theUser = user;
            break;
        }
    }

    const APIKey = "API-" + Tools.generateUUID("XXXXXXXXXXXXXXXXXXXXXXX");

    const newApiKey = await ApiKey.create({ user: theUser, key: APIKey });
    theAccount.apiKeys.push(newApiKey);
    await theAccount.save();

    await newApiKey.populate("user");

    resData.apiKeys.push(newApiKey);

    resData.apikeySuccessMessage = `API Key has successfully been created: ${APIKey}`;
    res.render("dashboard/account", resData);
};

exports.getDeleteUser = async (req, res, next) => {
    const userId = req.params.userId;

    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    if (!ObjectId.isValid(userId)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
    });

    if (theAccount == null) {
        const error = new Error("Cant Find Account details!");
        error.httpStatusCode = 500;
        return next(error);
    }

    await theAccount.populate("users");
    await theAccount.populate("userInvites");

    let found = false;
    let foundIndex = -1;

    for (let i = 0; i < theAccount.users.length; i++) {
        const user = theAccount.users[i];
        if (user._id == userId) {
            found = true;
            foundIndex = i;
            break;
        }
    }
    let userInvite = -1;
    for (let i = 0; i < theAccount.userInvites.length; i++) {
        const invite = theAccount.userInvites[i];
        if (invite.user == userId) {
            userInvite = i;
        }
    }

    if (!found) {
        if (!ObjectId.isValid(userId)) {
            const error = new Error("User Not Found!");
            error.httpStatusCode = 500;
            return next(error);
        }
    }

    if (userInvite != -1) {
        theAccount.userInvites.splice(userInvite, 1);
    }

    theAccount.users.splice(foundIndex, 1);
    await theAccount.save();

    await User.deleteOne({ _id: userId });
    await UserInvite.deleteOne({ user: userId });

    return res.redirect("/dashboard/account");
};

exports.getDeleteUserInvite = async (req, res, next) => {
    const inviteId = req.params.inviteId;

    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    if (!ObjectId.isValid(inviteId)) {
        const error = new Error("Invalid User Invite ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
    });

    if (theAccount == null) {
        const error = new Error("Cant Find Account details!");
        error.httpStatusCode = 500;
        return next(error);
    }
    await theAccount.populate("userInvites");

    let userInvite = -1;
    for (let i = 0; i < theAccount.userInvites.length; i++) {
        const invite = theAccount.userInvites[i];
        if (invite._id == inviteId) {
            userInvite = i;
            break;
        }
    }

    if (userInvite == -1) {
        if (!ObjectId.isValid(userId)) {
            const error = new Error("User Not Found!");
            error.httpStatusCode = 500;
            return next(error);
        }
    }

    theAccount.userInvites.splice(userInvite, 1);
    await theAccount.save();

    await UserInvite.deleteOne({ _id: inviteId });

    return res.redirect("/dashboard/account");
};

exports.getSaves = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({ users: req.session.user._id });

    if (theAccount) {
        await theAccount.populate("agents");

        for (let i = 0; i < theAccount.agents.length; i++) {
            const agent = theAccount.agents[i];
            await agent.populate("saves");
        }

        res.render("dashboard/saves", {
            path: "/saves",
            pageTitle: "Saves",
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            errorMessage: "",
        });
    } else {
        res.render("dashboard/account", {
            path: "/account",
            pageTitle: "Account",
            accountName: "",
            agents: [],
            saves: [],
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};

exports.postSaves = async (req, res, next) => {
    const data = req.body;
    const file = req.file;

    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    if (!ObjectId.isValid(data.inp_agentid)) {
        const error = new Error("Invalid Agent ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
        agents: data.inp_agentid,
    });

    if (theAccount == null) {
        const error = new Error("Cant Find Account details!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAgent = await Agent.findOne({ _id: data.inp_agentid });

    const newFilePath = path.join(
        Config.get("ssm.uploadsdir"),
        theAgent._id.toString(),
        "saves",
        file.originalname
    );

    try {
        if (fs.existsSync(newFilePath)) {
            fs.unlinkSync(newFilePath);
        }

        fs.moveSync(file.path, newFilePath);
    } catch (err) {}

    const message = await MessageQueueItem.create({
        action: "downloadSave",
        data: {
            saveFile: file.originalname,
        },
    });

    theAgent.messageQueue.push(message);
    await theAgent.save();

    await theAccount.populate("agents");
    for (let i = 0; i < theAccount.agents.length; i++) {
        const agent = theAccount.agents[i];
        await agent.populate("saves");
    }

    res.render("dashboard/saves", {
        path: "/saves",
        pageTitle: "Saves",
        accountName: theAccount.accountName,
        agents: theAccount.agents,
        errorMessage: "",
    });
};

exports.getDownloadSave = async (req, res, next) => {
    const agentId = req.params.agentId;
    const fileName = req.params.fileName;

    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    if (!ObjectId.isValid(agentId)) {
        const error = new Error("Invalid Agent ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({ users: req.session.user._id });

    if (theAccount == null) {
        const error = new Error("Cant Find Account details!");
        error.httpStatusCode = 500;
        return next(error);
    }

    await theAccount.populate("agents");

    const theAgent = theAccount.agents.find((a) => a._id == agentId);
    if (theAgent == null) {
        const error = new Error("Cant Find Agent");
        error.httpStatusCode = 500;
        return next(error);
    }
    await theAgent.populate("saves");

    const theSave = theAgent.saves.find((s) => s.fileName == fileName);

    if (theSave == null) {
        const error = new Error("Cant Find Save File");
        error.httpStatusCode = 500;
        return next(error);
    }

    const filePath = path.join(
        Config.get("ssm.uploadsdir"),
        theAgent._id.toString(),
        "saves",
        theSave.fileName
    );

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).render("404", {
            pageTitle: "Page Not Found",
            path: "/404",
            isAuthenticated: req.session.isLoggedIn,
        });
    }
};

exports.getMods = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({ users: req.session.user._id });

    if (theAccount) {
        await theAccount.populate("agents");

        const mods = await ModModel.find().sort({ modName: 1 });

        res.render("dashboard/mods", {
            path: "/mods",
            pageTitle: "Mods",
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            mods,
            errorMessage: "",
        });
    } else {
        res.render("dashboard/mods", {
            path: "/mods",
            pageTitle: "Mods",
            accountName: "",
            agents: [],
            mods: [],
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};
