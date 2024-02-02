var ObjectId = require("mongoose").Types.ObjectId;

const fs = require("fs-extra");
const path = require("path");

const Config = require("../server/server_config");

const NotificationSystem = require("../server/server_notification_system");

const Account = require("../models/account");
const Agent = require("../models/agent");
const User = require("../models/user");
const ModModel = require("../models/mod");

const NotificationEventTypeModel = require("../models/intergration_event_type");
const NotificationSettingsModel = require("../models/account_intergrations");

const semver = require("semver");

const BackendAPI = require("../utils/backend-api");

exports.Servers = require("./dashboard/servers");
exports.Account = require("./dashboard/account");
exports.Logs = require("./dashboard/logs");

exports.getDashboard = async (req, res, next) => {
    const theAccount = await BackendAPI.GetAccount(req.session.token);

    let message = req.flash("success");
    message.length > 0 ? (message = message[0]) : (message = null);

    if (theAccount) {
        const agents = await BackendAPI.GetAgents(req.session.token);

        res.render("dashboard/dashboard", {
            path: "/dashboard",
            pageTitle: "Dashboard",
            accountName: theAccount.accountName,
            agents,
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

    try {
        if (
            action != "start" &&
            action != "stop" &&
            action != "kill" &&
            action != "install" &&
            action != "update"
        ) {
            throw new Error("Invalid server action");
        }

        const theAccount = await BackendAPI.GetAccount(req.session.token);

        if (theAccount == null) {
            throw new Error("Account is null!");
        }

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

        await BackendAPI.CreateAgentTask(req.session.token, agentid, {
            action: actionString,
        });

        const successMessageData = {
            agentId: agentid,
            message:
                "Server Action was successfully sent to the server and will run in the background.",
        };

        req.flash("success", JSON.stringify(successMessageData));
    } catch (err) {
        const errorMessageData = {
            agentId: agentid,
            message: err.message,
        };

        req.flash("error", JSON.stringify(errorMessageData));
    }
    res.redirect("/dashboard");
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

exports.postSaves = async (req, res, next) => {
    const { agentid } = req.params;

    const file = req.file;

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

        if (file == null) {
            throw new Error("No save file was selected");
        }

        const newFilePath = path.join(
            Config.get("ssm.uploadsdir"),
            theAccount._id,
            theAgent._id,
            "saves",
            file.originalname
        );
        if (fs.existsSync(newFilePath)) {
            fs.unlinkSync(newFilePath);
        }

        fs.moveSync(file.path, newFilePath);

        await BackendAPI.CreateAgentTask(req.session.token, agentid, {
            action: "downloadSave",
            data: {
                saveFile: file.originalname,
            },
        });

        const successMessageData = {
            section: "serverlist",
            message: `Save file has been successfully uploaded, transfering save file to Server in the background.`,
        };

        req.flash("success", JSON.stringify(successMessageData));
    } catch (err) {
        const errorMessageData = {
            section: "serverlist",
            message: err.message,
        };

        req.flash("error", JSON.stringify(errorMessageData));
    }

    return res.redirect(`/dashboard/servers/${agentid}`);
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

exports.postInstallMod = async (req, res, next) => {
    const { agentId, modId } = req.body;

    try {
        const theAccount = await BackendAPI.GetAccount(req.session.token);
        const theAgent = await BackendAPI.GetAgentById(
            req.session.token,
            agentId
        );

        if (theAccount == null) {
            throw new Error("Account was null");
        }

        if (theAgent == null) {
            throw new Error("Agent was null");
        }

        await BackendAPI.InstallAgentMod(req.session.token, agentId, modId);
    } catch (err) {
        console.log(err);
        return res.json({ success: false, error: err.message });
    }

    return res.json({ success: true });
};

exports.postUninstallMod = async (req, res, next) => {
    const { agentId, modId } = req.body;

    try {
        const theAccount = await BackendAPI.GetAccount(req.session.token);
        const theAgent = await BackendAPI.GetAgentById(
            req.session.token,
            agentId
        );

        if (theAccount == null) {
            throw new Error("Account was null");
        }

        if (theAgent == null) {
            throw new Error("Agent was null");
        }

        await BackendAPI.UninstallAgentMod(req.session.token, agentId, modId);
    } catch (err) {
        console.log(err);
        return res.json({ success: false, error: err.message });
    }

    return res.json({ success: true });
};

exports.getIntegrationsPage = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("page.intergrations");

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
        await theAccount.populate("intergrations");
        await theAccount.populate("notifications");

        for (let i = 0; i < theAccount.intergrations.length; i++) {
            const setting = theAccount.intergrations[i];
            await setting.populate("eventTypes");
        }

        for (let i = 0; i < theAccount.notifications.length; i++) {
            const notification = theAccount.notifications[i];
            await notification.populate("events");
            await notification.populate("eventType");
            await notification.populate("intergration");
        }

        let message = req.flash("success");
        message.length > 0 ? (message = message[0]) : (message = null);

        let errorMessage = req.flash("error");
        errorMessage.length > 0
            ? (errorMessage = errorMessage[0])
            : (errorMessage = null);

        res.render("dashboard/integrations", {
            path: "/integrations",
            pageTitle: "Integrations",
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            intergrations: theAccount.intergrations,
            notifications: theAccount.notifications,
            eventTypes,
            message,
            errorMessage,
        });
    } else {
        res.render("dashboard/integrations", {
            path: "/integrations",
            pageTitle: "Integrations",
            accountName: "",
            agents: [],
            intergrations: [],
            notifications: [],
            eventTypes: [],
            message: "",
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};

exports.postUpdateNotificationSettings = async (req, res, next) => {
    const intergrationId = req.params.settingsId;
    const data = req.body;

    if (!ObjectId.isValid(req.session.user._id)) {
        const errorMessageData = {
            section: "settings",
            id: intergrationId,
            message: "Invalid Session User ID Format",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.json({});
    }

    if (!ObjectId.isValid(intergrationId)) {
        const errorMessageData = {
            section: "settings",
            id: intergrationId,
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
            id: intergrationId,
            message: "You dont have permission to perform this action!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.json({});
    }

    const theNotificationSetting = await NotificationSettingsModel.findOne({
        _id: intergrationId,
    });

    if (theNotificationSetting == null) {
        const errorMessageData = {
            section: "settings",
            id: intergrationId,
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
            id: intergrationId,
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
        id: intergrationId,
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

    theAccount.intergrations.push(newNotificationSettings);
    await theAccount.save();
    const successMessageData = {
        section: "newsettings",
        message: `Notification settings has been created successfully!`,
    };

    req.flash("success", JSON.stringify(successMessageData));
    return res.json({});
};

exports.getDeleteNotificationSettings = async (req, res, next) => {
    const intergrationId = req.params.settingsId;

    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    if (!ObjectId.isValid(intergrationId)) {
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
                intergrations: [{ _id: intergrationId }],
            },
        }
    );

    await NotificationSettingsModel.deleteOne({ _id: intergrationId });

    res.redirect("/dashboard/intergrations");
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
