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
