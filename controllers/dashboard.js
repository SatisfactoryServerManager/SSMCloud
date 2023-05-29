var ObjectId = require("mongoose").Types.ObjectId;

const Mrhid6Utils = require("mrhid6utils");
const Tools = Mrhid6Utils.Tools;

const fs = require("fs-extra");
const path = require("path");

const Config = require("../server/server_config");

const { validationResult } = require("express-validator");

const NotificationSystem = require("../server/server_notification_system");

const Account = require("../models/account");
const Agent = require("../models/agent");
const MessageQueueItem = require("../models/messagequeueitem");
const User = require("../models/user");
const UserInvite = require("../models/user_invite");
const UserRole = require("../models/user_role");
const Permission = require("../models/permission");
const AgentSaveFile = require("../models/agent_save");
const AgentBackup = require("../models/agent_backup");
const ApiKey = require("../models/apikey");
const ModModel = require("../models/mod");
const AgentLogInfo = require("../models/agent_log_info");
const AgentModStateModel = require("../models/agent_mod_state.model");

const NotificationEventTypeModel = require("../models/notification_event_type");
const NotificationSettingsModel = require("../models/account_notification_setting");

const SelectedModSchema = require("../models/selectedMod.schema");

const AgentHandler = require("../server/server_agent_handler");

const semver = require("semver");

exports.getDashboard = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("page.dashboard");

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

    let message = req.flash("success");
    message.length > 0 ? (message = message[0]) : (message = null);

    if (theAccount) {
        await theAccount.populate("agents");

        for (let i = 0; i < theAccount.agents.length; i++) {
            const agent = theAccount.agents[i];
            await agent.populate("players");
        }

        res.render("dashboard/dashboard", {
            path: "/dashboard",
            pageTitle: "Dashboard",
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            errorMessage: "",
            message,
        });
    } else {
        res.render("dashboard/dashboard", {
            path: "/dashboard",
            pageTitle: "Dashboard",
            accountName: "",
            agents: [],
            message,
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

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission(`serveraction.${action}`);

    if (!hasPermission) {
        res.status(403).render("403", {
            path: "/dashboard",
            pageTitle: "403 - Forbidden",
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

    const successMessageData = {
        agentId: theAgent._id,
        message:
            "Server Action was successfully sent to the server and will run in the background.",
    };

    req.flash("success", JSON.stringify(successMessageData));

    res.redirect("/dashboard");
};

exports.Servers = require("./dashboard/servers");

exports.getBackups = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("page.backups");

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

    const theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("backup.download");

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

exports.Account = require("./dashboard/account");

exports.getSaves = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("page.saves");

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

        for (let i = 0; i < theAccount.agents.length; i++) {
            const agent = theAccount.agents[i];
            await agent.populate("saves");
        }

        let message = req.flash("success");
        message.length > 0 ? (message = message[0]) : (message = null);

        let errorMessage = req.flash("error");
        errorMessage.length > 0
            ? (errorMessage = errorMessage[0])
            : (errorMessage = null);

        res.render("dashboard/saves", {
            path: "/saves",
            pageTitle: "Saves",
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            errorMessage,
            message,
        });
    } else {
        res.render("dashboard/saves", {
            path: "/saves",
            pageTitle: "Saves",
            accountName: "",
            agents: [],
            saves: [],
            message: "",
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};

exports.postSaves = async (req, res, next) => {
    const data = req.body;
    const file = req.file;

    if (!ObjectId.isValid(req.session.user._id)) {
        const errorMessageData = {
            section: "serverlist",
            message: "Invalid Session User ID Format",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/saves");
    }

    if (!ObjectId.isValid(data.inp_agentid)) {
        const errorMessageData = {
            section: "serverlist",
            message: "Invalid Requested Server ID Format",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/saves");
    }

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("saves.upload");

    if (!hasPermission) {
        const errorMessageData = {
            section: "serverlist",
            message: "You dont have permission to perform this action!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/saves");
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
        agents: data.inp_agentid,
    });

    if (theAccount == null) {
        const errorMessageData = {
            section: "serverlist",
            message: "Cant Find Session Account details!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/saves");
    }

    const theAgent = await Agent.findOne({ _id: data.inp_agentid }).select(
        "+messageQueue"
    );

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

    const successMessageData = {
        section: "serverlist",
        message: `Save file has been successfully uploaded, transfering save file to Server in the background.`,
    };

    req.flash("success", JSON.stringify(successMessageData));
    return res.redirect("/dashboard/saves");
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

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("saves.download");

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

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("page.mods");

    if (!hasPermission) {
        res.status(403).render("403", {
            path: "/dashboard",
            pageTitle: "403 - Forbidden",
            accountName: "",
            agents: [],
            errorMessage: "You dont have permission to view this page.",
        });
        return;
    }

    const theAccount = await Account.findOne({ users: req.session.user._id });

    let message = req.flash("success");
    message.length > 0 ? (message = message[0]) : (message = null);

    if (theAccount) {
        await theAccount.populate("agents");

        for (let i = 0; i < theAccount.agents.length; i++) {
            const agent = theAccount.agents[i];

            if (agent.modState) {
                await agent.populate("modState");

                for (let j = 0; j < agent.modState.selectedMods.length; j++) {
                    await agent.modState.populate(`selectedMods.${j}.mod`);
                }
            } else {
                const newModState = await AgentModStateModel.create({});
                agent.modState = newModState;
                await agent.save();
            }
        }

        const mods = await ModModel.find().sort({ modName: 1 });

        res.render("dashboard/mods", {
            path: "/mods",
            pageTitle: "Mods",
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            message,
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
            message,
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};

exports.postInstallMod = async (req, res, next) => {
    const { agentId, modId } = req.body;

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

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("server.mods.install");

    if (!hasPermission) {
        res.status(403).render("403", {
            path: "/dashboard",
            pageTitle: "403 - Forbidden",
            accountName: "",
            agents: [],
            errorMessage: "You dont have permission to view this page.",
        });
        return;
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
        agents: agentId,
    });

    if (theAccount == null) {
        const error = new Error("Cant Find Account details!");
        error.httpStatusCode = 500;
        return next(error);
    }

    await theAccount.populate("agents");

    const theAgent = await Agent.findOne({ _id: agentId });

    const theMod = await ModModel.findOne({
        _id: modId,
    });

    if (theMod.versions.length == 0) {
        const error = new Error("Cant Find Mod Versions");
        error.httpStatusCode = 500;
        return next(error);
    }

    await theAgent.populate("modState");

    const modState = theAgent.modState;

    for (let i = 0; i < modState.selectedMods.length; i++) {
        await modState.populate(`selectedMods.${i}.mod`);
    }

    const selectedMod = modState.selectedMods.find(
        (sm) => sm.mod._id == theMod._id.toString()
    );

    const lastestVersion = theMod.versions[0];

    if (selectedMod == null) {
        const newSelectedMod = {
            mod: theMod,
            desiredVersion: lastestVersion.version,
        };
        modState.selectedMods.push(newSelectedMod);
        await modState.save();
    } else {
        selectedMod.desiredVersion = lastestVersion.version;
        selectedMod.needsUpdate = false;
        await modState.save();
    }

    if (lastestVersion.dependencies.length > 0) {
        for (let i = 0; i < lastestVersion.dependencies.length; i++) {
            const depMod = lastestVersion.dependencies[i];

            const depVersion = depMod.condition.replace("^", "");

            const theModDep = await ModModel.findOne({
                modName: depMod.mod_id,
            });

            if (theModDep == null) {
                continue;
            }

            const selectedDepMod = modState.selectedMods.find(
                (sm) => sm.mod._id == theModDep._id.toString()
            );

            if (selectedDepMod == null) {
                const newSelectedDepMod = {
                    mod: theModDep,
                    desiredVersion: depVersion,
                };
                console.log(newSelectedDepMod);
                modState.selectedMods.push(newSelectedDepMod);
                await modState.save();
            } else {
                if (semver.lt(selectedDepMod.desiredVersion, depVersion)) {
                    selectedDepMod.desiredVersion = depVersion;
                    await modState.save();
                }
            }
        }
    }
};

exports.postUninstallMod = async (req, res, next) => {
    const { agentId, modId } = req.body;

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

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("server.mods.install");

    if (!hasPermission) {
        res.status(403).render("403", {
            path: "/dashboard",
            pageTitle: "403 - Forbidden",
            accountName: "",
            agents: [],
            errorMessage: "You dont have permission to view this page.",
        });
        return;
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
        agents: agentId,
    });

    if (theAccount == null) {
        const error = new Error("Cant Find Account details!");
        error.httpStatusCode = 500;
        return next(error);
    }

    await theAccount.populate("agents");

    const theAgent = await Agent.findOne({ _id: agentId });

    const theMod = await ModModel.findOne({
        _id: modId,
    });

    await theAgent.populate("modState");

    const modState = theAgent.modState;

    for (let i = 0; i < modState.selectedMods.length; i++) {
        await modState.populate(`selectedMods.${i}.mod`);
    }

    const selectedMod = modState.selectedMods.find(
        (sm) => sm.mod._id == theMod._id.toString()
    );

    if (selectedMod != null) {
        modState.selectedMods.pull(selectedMod);
        await modState.save();
    }
};

exports.Logs = require("./dashboard/logs");

exports.getNotifications = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("page.notifications");

    if (!hasPermission) {
        res.status(403).render("403", {
            path: "/dashboard",
            pageTitle: "403 - Forbidden",
            accountName: "",
            agents: [],
            errorMessage: "You dont have permission to view this page.",
        });
        return;
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
    }).select("+notifications");

    const eventTypes = await NotificationEventTypeModel.find();

    if (theAccount) {
        await theAccount.populate("agents");
        await theAccount.populate("notificationSettings");
        await theAccount.populate("notifications");

        for (let i = 0; i < theAccount.notificationSettings.length; i++) {
            const setting = theAccount.notificationSettings[i];
            await setting.populate("eventTypes");
        }

        for (let i = 0; i < theAccount.notifications.length; i++) {
            const notification = theAccount.notifications[i];
            await notification.populate("events");
            await notification.populate("eventType");
            await notification.populate("notificationSetting");
        }

        let message = req.flash("success");
        message.length > 0 ? (message = message[0]) : (message = null);

        let errorMessage = req.flash("error");
        errorMessage.length > 0
            ? (errorMessage = errorMessage[0])
            : (errorMessage = null);

        res.render("dashboard/notifications", {
            path: "/notifications",
            pageTitle: "Notifications",
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            notificationSettings: theAccount.notificationSettings,
            notifications: theAccount.notifications,
            eventTypes,
            message,
            errorMessage,
        });
    } else {
        res.render("dashboard/notifications", {
            path: "/notifications",
            pageTitle: "Notifications",
            accountName: "",
            agents: [],
            notificationSettings: [],
            notifications: [],
            eventTypes: [],
            message: "",
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};

exports.postUpdateNotificationSettings = async (req, res, next) => {
    const notificationSettingId = req.params.settingsId;
    const data = req.body;

    if (!ObjectId.isValid(req.session.user._id)) {
        const errorMessageData = {
            section: "settings",
            id: notificationSettingId,
            message: "Invalid Session User ID Format",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.json({});
    }

    if (!ObjectId.isValid(notificationSettingId)) {
        const errorMessageData = {
            section: "settings",
            id: notificationSettingId,
            message: "Invalid Requested Notification Settings ID Format",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.json({});
    }

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("notifications.update");

    if (!hasPermission) {
        const errorMessageData = {
            section: "settings",
            id: notificationSettingId,
            message: "You dont have permission to perform this action!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.json({});
    }

    const theNotificationSetting = await NotificationSettingsModel.findOne({
        _id: notificationSettingId,
    });

    if (theNotificationSetting == null) {
        const errorMessageData = {
            section: "settings",
            id: notificationSettingId,
            message: "Cant Find Notification Settings details!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.json({});
    }

    try {
        if (data.sel_type.toLowerCase() == "webhook") {
            await NotificationSystem.TestWebhook(data.inp_url);
        } else {
        }
    } catch (err) {
        const errorMessageData = {
            section: "settings",
            id: notificationSettingId,
            message: "Failed to connect to notification url endpoint!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.json({});
    }

    theNotificationSetting.notificationType = data.sel_type.toLowerCase();
    theNotificationSetting.url = data.inp_url;

    const eventTypes = await NotificationEventTypeModel.find({
        _id: { $in: data.eventTypes },
    });
    theNotificationSetting.eventTypes = eventTypes;

    await theNotificationSetting.save();
    const successMessageData = {
        section: "settings",
        id: notificationSettingId,
        message: `Notification settings has been updated successfully!`,
    };

    req.flash("success", JSON.stringify(successMessageData));
    return res.json({});
};

exports.postNewNotitifcationSettings = async (req, res, next) => {
    const data = req.body;

    if (!ObjectId.isValid(req.session.user._id)) {
        const errorMessageData = {
            section: "newsettings",
            message: "Invalid Session User ID Format",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.json({});
    }

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("notifications.update");

    if (!hasPermission) {
        const errorMessageData = {
            section: "newsettings",
            message: "You dont have permission to perform this action!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.json({});
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
    }).select("+notifications");

    try {
        if (data.sel_type.toLowerCase() == "webhook") {
            await NotificationSystem.TestWebhook(data.inp_url);
        } else {
        }
    } catch (err) {
        const errorMessageData = {
            section: "newsettings",
            message: "Failed to connect to notification url endpoint!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.json({});
    }

    if (data.eventTypes == null || data.eventTypes.length == 0) {
        const errorMessageData = {
            section: "newsettings",
            message: "Must contain at least one event type!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.json({});
    }

    const eventTypes = await NotificationEventTypeModel.find({
        _id: { $in: data.eventTypes },
    });

    const newNotificationSettings = await NotificationSettingsModel.create({
        url: data.inp_url,
        notificationType: data.sel_type.toLowerCase(),
        eventTypes: eventTypes,
    });

    theAccount.notificationSettings.push(newNotificationSettings);
    await theAccount.save();
    const successMessageData = {
        section: "newsettings",
        message: `Notification settings has been created successfully!`,
    };

    req.flash("success", JSON.stringify(successMessageData));
    return res.json({});
};

exports.getDeleteNotificationSettings = async (req, res, next) => {
    const notificationSettingId = req.params.settingsId;

    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    if (!ObjectId.isValid(notificationSettingId)) {
        const error = new Error("Invalid Notification Settings ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("notifications.update");

    if (!hasPermission) {
        res.status(403).render("403", {
            path: "/dashboard",
            pageTitle: "403 - Forbidden",
            accountName: "",
            agents: [],
            errorMessage: "You dont have permission to view this page.",
        });
        return;
    }

    await Account.updateOne(
        {
            users: req.session.user._id,
        },
        {
            $pullAll: {
                notificationSettings: [{ _id: notificationSettingId }],
            },
        }
    );

    await NotificationSettingsModel.deleteOne({ _id: notificationSettingId });

    res.redirect("/dashboard/notifications");
};

exports.getProfile = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("page.profile");

    if (!hasPermission) {
        res.status(403).render("403", {
            path: "/dashboard",
            pageTitle: "403 - Forbidden",
            accountName: "",
            agents: [],
            errorMessage: "You dont have permission to view this page.",
        });
        return;
    }

    const theAccount = await Account.findOne({ users: req.session.user._id });

    let message = req.flash("success");
    message.length > 0 ? (message = message[0]) : (message = null);

    if (theAccount) {
        await theAccount.populate("agents");

        res.render("dashboard/profile", {
            path: "/profile",
            pageTitle: "My Profile",
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            user: theUser,
            message,
            errorMessage: "",
        });
    } else {
        res.render("dashboard/profile", {
            path: "/profile",
            pageTitle: "My Profile",
            accountName: "",
            agents: [],
            mods: [],
            message,
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};

exports.getProfileImage = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("page.profile");

    if (!hasPermission) {
        res.status(403).render("403", {
            path: "/dashboard",
            pageTitle: "403 - Forbidden",
            accountName: "",
            agents: [],
            errorMessage: "You dont have permission to view this page.",
        });
        return;
    }

    if (theUser.profileImage == "") {
        const imagePath = path.join(
            __basedir,
            "/public/images/blank-profile-image.png"
        );
        res.sendFile(imagePath);
        return;
    }

    if (!fs.existsSync(theUser.profileImage)) {
        const imagePath = path.join(
            __basedir,
            "/public/images/blank-profile-image.png"
        );
        res.sendFile(imagePath);
        return;
    }

    res.sendFile(theUser.profileImage);
};
