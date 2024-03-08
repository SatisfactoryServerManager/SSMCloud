var ObjectId = require("mongoose").Types.ObjectId;

const Mrhid6Utils = require("mrhid6utils");
const Tools = Mrhid6Utils.Tools;

const fs = require("fs-extra");
const path = require("path");

const EmailHandler = require("../../server/server_email_handler");

const BackendAPI = require("../../utils/backend-api");

const { validationResult } = require("express-validator");

exports.getAccount = async (req, res, next) => {
    const theAccount = await BackendAPI.GetAccount(req.session.token);

    if (theAccount) {
        const users = await BackendAPI.GetUsers(req.session.token);

        const agents = await BackendAPI.GetAgents(req.session.token);

        let message = req.flash("success");
        message.length > 0 ? (message = message[0]) : (message = null);

        let errorMessage = req.flash("error");
        errorMessage.length > 0
            ? (errorMessage = errorMessage[0])
            : (errorMessage = null);

        res.render("dashboard/account", {
            path: "/account",
            pageTitle: "Account",
            accountName: theAccount.accountName,
            agents: agents,
            users: users,
            userRoles: [],
            userInvites: [],
            apiKeys: [],
            events: [],
            permissions: [],
            inviteUrl: `${req.protocol}://${req.headers.host}/acceptinvite`,
            inviteErrorMessage: null,
            userErrorMessage: null,
            errorMessage,
            message,
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
            events: [],
            inviteUrl: `${req.protocol}://${req.headers.host}/acceptinvite`,
            inviteErrorMessage: null,
            userErrorMessage: null,
            apikeyErrorMessage: null,
            apikeySuccessMessage: null,
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};

exports.getAccountUsers = async (req, res, next) => {
    try {
        const Users = await BackendAPI.GetUsers(req.session.token);

        res.json({
            success: true,
            users: Users,
        });
    } catch (err) {
        res.json({
            success: false,
            error: err.message,
        });
        return;
    }
};

exports.postAccountUser = async (req, res, next) => {
    const data = req.body;

    if (data.email == undefined || data.email.trim() == "") {
        res.json({
            success: false,
            error: "Please provide a user email address",
        });
        return;
    }

    try {
        const Users = await BackendAPI.GetUsers(req.session.token);

        for (let i = 0; i < Users.length; i++) {
            const user = Users[i];
            if (user.email == data.email) {
                res.json({
                    success: false,
                    error: "User already exists!",
                });
                return;
            }
        }

        const apiRes = await BackendAPI.PostCreateAccountUser(
            req.session.token,
            data.email
        );
    } catch (err) {
        res.json({
            success: false,
            error: err.message,
        });
        return;
    }

    res.json({
        success: true,
    });
};

exports.postAccountApiKey = async (req, res, next) => {
    const data = req.body;

    if (!ObjectId.isValid(req.session.user._id)) {
        const errorMessageData = {
            section: "user",
            message: "Invalid Session User ID Format",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    let theRequestUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theRequestUser.HasPermission(
        "user.apikey.create"
    );

    if (!hasPermission) {
        const errorMessageData = {
            section: "api",
            message: "You dont have permission to perform this action!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
    });

    if (theAccount == null) {
        const errorMessageData = {
            section: "api",
            message: "Cant find session Account Details!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessageData = {
            section: "api",
            message: errors.array()[0].msg,
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    let theUser = null;
    for (let i = 0; i < theAccount.users.length; i++) {
        const user = theAccount.users[i];
        if (user._id == data.inp_user) {
            theUser = user;
            break;
        }
    }

    if (theUser == null) {
        const successMessageData = {
            section: "api",
            message: `Requested user is not in this account!`,
        };

        req.flash("error", JSON.stringify(successMessageData));
        return res.redirect("/dashboard/account");
    }

    const APIKey = "API-" + Tools.generateUUID("XXXXXXXXXXXXXXXXXXXXXXX");

    const newApiKey = await ApiKey.create({ user: theUser, key: APIKey });
    theAccount.apiKeys.push(newApiKey);
    await theAccount.save();

    await newApiKey.populate("user");

    const successMessageData = {
        section: "api",
        message: `API Key has successfully been created: ${APIKey}`,
    };

    req.flash("success", JSON.stringify(successMessageData));
    res.redirect("/dashboard/account");
};

exports.getDeleteUser = async (req, res, next) => {
    const userId = req.params.userId;

    if (!ObjectId.isValid(req.session.user._id)) {
        const errorMessageData = {
            section: "user",
            message: "Invalid Session User ID Format",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    if (!ObjectId.isValid(userId)) {
        const errorMessageData = {
            section: "user",
            message: "Invalid Requested User ID Format",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("user.delete");

    if (!hasPermission) {
        const errorMessageData = {
            section: "user",
            message: "You dont have permission to perform this action!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
    });

    if (theAccount == null) {
        const errorMessageData = {
            section: "user",
            message: "Cant Find Session Account details!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
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
        const errorMessageData = {
            section: "user",
            message: "Cant Find Requested User on this Account!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    if (userInvite != -1) {
        theAccount.userInvites.splice(userInvite, 1);
    }

    const theUserToDelete = await User.findOne({ _id: userId });

    if (theUserToDelete.isAccountAdmin) {
        const errorMessageData = {
            section: "user",
            message: "You want delete this user as they are Account Admins!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    theAccount.users.splice(foundIndex, 1);

    await User.deleteOne({ _id: userId });
    await UserInvite.deleteOne({ user: userId });

    await theAccount.populate("apiKeys");

    for (let i = 0; i < theAccount.apiKeys.length; i++) {
        const key = theAccount.apiKeys[i];
        if (key.user == userId) {
            theAccount.apiKeys.splice(i, 1);
        }
    }

    await ApiKey.deleteMany({ user: userId });
    await theAccount.save();

    const successMessageData = {
        section: "user",
        message: "User successfully deleted!",
    };

    req.flash("success", JSON.stringify(successMessageData));
    return res.redirect("/dashboard/account");
};

exports.getDeleteUserInvite = async (req, res, next) => {
    const inviteId = req.params.inviteId;

    if (!ObjectId.isValid(req.session.user._id)) {
        const errorMessageData = {
            section: "userinvite",
            message: "Invalid Session User ID Format",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    if (!ObjectId.isValid(inviteId)) {
        const errorMessageData = {
            section: "userinvite",
            message: "Invalid Request User Invite ID Format",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("user.delete");

    if (!hasPermission) {
        const errorMessageData = {
            section: "userinvite",
            message: "You dont have permission to perform this action!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
    });

    if (theAccount == null) {
        const errorMessageData = {
            section: "userinvite",
            message: "Cant Find Session Account details!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
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
        const errorMessageData = {
            section: "userinvite",
            message: "Cant Find Requested User Invite!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    const theInvite = await UserInvite.findOne({ _id: inviteId });
    await theInvite.populate("user");

    theAccount.userInvites.splice(userInvite, 1);
    await theAccount.save();

    await UserInvite.deleteOne({ _id: inviteId });

    const successMessageData = {
        section: "userinvite",
        message: "User Invite successfully deleted!",
    };

    req.flash("success", JSON.stringify(successMessageData));
    return res.redirect("/dashboard/account");
};

exports.getDeleteApiKey = async (req, res, next) => {
    const apiKeyId = req.params.apiKeyId;

    if (!ObjectId.isValid(req.session.user._id)) {
        const errorMessageData = {
            section: "api",
            message: "Invalid Session User ID Format",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    if (!ObjectId.isValid(apiKeyId)) {
        const errorMessageData = {
            section: "api",
            message: "Invalid Request API Key ID Format",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("user.apikey.delete");

    if (!hasPermission) {
        const errorMessageData = {
            section: "api",
            message: "You dont have permission to perform this action!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
    });

    if (theAccount == null) {
        const errorMessageData = {
            section: "api",
            message: "Cant Find Session Account details!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    await theAccount.populate("apiKeys");

    let keyIndex = -1;
    for (let i = 0; i < theAccount.apiKeys.length; i++) {
        const key = theAccount.apiKeys[i];
        if (key._id == apiKeyId) {
            keyIndex = i;
            break;
        }
    }

    if (keyIndex == -1) {
        const errorMessageData = {
            section: "api",
            message: "Cant Find Requested API Key on this account!",
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/dashboard/account");
    }

    theAccount.apiKeys.splice(keyIndex, 1);
    await theAccount.save();

    await ApiKey.deleteOne({ _id: apiKeyId });

    const successMessageData = {
        section: "api",
        message: "API Key successfully deleted!",
    };

    req.flash("success", JSON.stringify(successMessageData));
    return res.redirect("/dashboard/account");
};

exports.getAccountAudit = async (req, res, next) => {
    try {
        const audit = await BackendAPI.GetAccountAudit(
            req.session.token,
            req.query.type
        );

        res.json({
            success: true,
            audit,
        });
    } catch (err) {
        res.json({
            success: false,
            error: err.message,
        });
    }
};
