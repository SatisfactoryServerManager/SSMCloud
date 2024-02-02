const bcrypt = require("bcryptjs");
const Account = require("../models/account");
const User = require("../models/user");
const UserInvite = require("../models/user_invite");

const BackendAPI = require("../utils/backend-api");

var ObjectId = require("mongoose").Types.ObjectId;

const { validationResult } = require("express-validator");

const QRCode = require("qrcode");

const { authenticator } = require("otplib");

const Config = require("../server/server_config");

const verifyHcaptcha = require("hcaptcha").verify;

exports.getLogout = async (req, res) => {
    const ip =
        req.headers["X-Real-IP"] ||
        req.headers["X-Fowarded-For"] ||
        req.socket.remoteAddress;

    const theUser = await User.findOne({ _id: req.session.user._id });
    const theAccount = await Account.findOne({ users: req.session.user._id });
    if (theAccount) {
        await theAccount.CreateEvent(
            "AUTH",
            `Log out Successful for user: [${theUser.email}] with ip: [${ip}]`,
            0
        );
    }

    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect("/login");
    });
};

exports.getLogin = (req, res) => {
    if (req.session.isLoggedIn) {
        res.redirect("/dashboard");
        return;
    }

    let message = req.flash("error");
    message.length > 0 ? (message = message[0]) : (message = null);

    console.log(message);

    res.render("auth/login", {
        path: "/login",
        pageTitle: "Log In",
        errorMessage: message,
        enableHcaptcha: Config.get("ssm.hcaptcha.enabled"),
        hcaptchaSiteKey: Config.get("ssm.hcaptcha.sitekey"),
        oldInput: {
            email: "",
            password: "",
        },
        validationErrors: [],
    });
};

exports.getSignUp = (req, res) => {
    if (Config.get("ssm.flags.disablesignuppage")) {
        res.redirect("/login");
    }

    let message = req.flash("error");
    message.length > 0 ? (message = message[0]) : (message = null);

    res.render("auth/signup", {
        path: "/signup",
        pageTitle: "Sign Up",
        errorMessage: message,
        enableHcaptcha: Config.get("ssm.hcaptcha.enabled"),
        hcaptchaSiteKey: Config.get("ssm.hcaptcha.sitekey"),
        oldInput: {
            email: "",
            password: "",
        },
        validationErrors: [],
    });
};

exports.postLogin = async (req, res, next) => {
    const { email, password } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render("auth/login", {
            path: "/login",
            pageTitle: "Log In",
            errorMessage: errors.array()[0].msg,
            enableHcaptcha: Config.get("ssm.hcaptcha.enabled"),
            hcaptchaSiteKey: Config.get("ssm.hcaptcha.sitekey"),
            oldInput: {
                email,
                password,
            },
            validationErrors: errors.array(),
        });
    }

    if (Config.get("ssm.hcaptcha.enabled")) {
        const secret = Config.get("ssm.hcaptcha.secret");
        const verified = await verifyHcaptcha(
            secret,
            req.body["h-captcha-response"]
        );
        if (verified.success == false) {
            return res.status(422).render("auth/login", {
                path: "/login",
                pageTitle: "Log In",
                errorMessage: "HCaptcha Failed!",
                enableHcaptcha: Config.get("ssm.hcaptcha.enabled"),
                hcaptchaSiteKey: Config.get("ssm.hcaptcha.sitekey"),
                oldInput: {
                    email,
                    password,
                },
                validationErrors: [],
            });
        }
    }

    try {
        let apires = await BackendAPI.POST_APICall_NoToken(
            "/api/v1/account/login",
            { email, password }
        );

        const loginSession = apires.session;
        req.session.token = loginSession;

        apires = await BackendAPI.GET_APICall_Token(
            "/api/v1/account/users/me",
            loginSession
        );

        const user = apires.user;

        return req.session.save(async (err) => {
            if (err) {
                console.log(err);
            }

            if (user.twoFAState.twoFASetup == false) {
                res.redirect("/2fa/setup");
            } else {
                res.redirect("/2fa/validate");
            }
        });
    } catch (err) {
        return res.status(422).render("auth/login", {
            path: "/login",
            pageTitle: "Log In",
            errorMessage: err.message,
            enableHcaptcha: Config.get("ssm.hcaptcha.enabled"),
            hcaptchaSiteKey: Config.get("ssm.hcaptcha.sitekey"),
            oldInput: {
                email,
                password,
            },
            validationErrors: [],
        });
    }
};

exports.postSignUp = async (req, res, next) => {
    if (Config.get("ssm.flags.disablesignuppage")) {
        res.redirect("/login");
    }

    const { email, password, confirmPassword, accountName } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log("Signup returned validation Errors:", errors);
        return res.status(422).render("auth/signup", {
            path: "/signup",
            pageTitle: "Sign Up",
            enableHcaptcha: Config.get("ssm.hcaptcha.enabled"),
            hcaptchaSiteKey: Config.get("ssm.hcaptcha.sitekey"),
            errorMessage: errors.array()[0].msg,
            oldInput: { email, password, confirmPassword, accountName },
            validationErrors: errors.array(),
        });
    }

    if (Config.get("ssm.hcaptcha.enabled")) {
        const secret = Config.get("ssm.hcaptcha.secret");
        const verified = await verifyHcaptcha(
            secret,
            req.body["h-captcha-response"]
        );
        if (verified.success == false) {
            return res.status(422).render("auth/signup", {
                path: "/signup",
                pageTitle: "Sign Up",
                errorMessage: "HCaptcha Failed!",
                enableHcaptcha: Config.get("ssm.hcaptcha.enabled"),
                hcaptchaSiteKey: Config.get("ssm.hcaptcha.sitekey"),
                oldInput: { email, password, confirmPassword, accountName },
                validationErrors: [],
            });
        }
    }

    try {
        await BackendAPI.POST_APICall_NoToken("/api/v1/account/signup", {
            email,
            password,
            accountName,
        });
        res.redirect("/login");
    } catch (err) {
        return res.status(422).render("auth/signup", {
            path: "/signup",
            pageTitle: "Sign Up",
            errorMessage: err.message,
            enableHcaptcha: Config.get("ssm.hcaptcha.enabled"),
            hcaptchaSiteKey: Config.get("ssm.hcaptcha.sitekey"),
            oldInput: { email, password, confirmPassword, accountName },
            validationErrors: [],
        });
    }
};

exports.getAcceptInvite = async (req, res, next) => {
    let message = req.flash("error");
    message.length > 0 ? (message = message[0]) : (message = null);
    if (!ObjectId.isValid(req.params.inviteId)) {
        const error = new Error("Invalid Invite ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const userInvite = await UserInvite.findOne({
        _id: req.params.inviteId,
        claimed: false,
    });

    if (userInvite == null) {
        res.redirect("/login");
        return;
    }

    res.render("auth/acceptinvite", {
        path: "/acceptinvite",
        pageTitle: "Accept Invite",
        errorMessage: message,
        oldInput: { email: "", password: "", confirmPassword: "" },
        validationErrors: [],
    });
};

exports.postAcceptInvite = async (req, res, next) => {
    if (!ObjectId.isValid(req.params.inviteId)) {
        const error = new Error("Invalid Invite ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const userInvite = await UserInvite.findOne({ _id: req.params.inviteId });

    if (userInvite == null) {
        res.redirect("/login");
        return;
    }

    const { email, password, confirmPassword } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render("auth/acceptinvite", {
            path: "/acceptinvite",
            pageTitle: "Accept Invite",
            errorMessage: errors.array()[0].msg,
            oldInput: { email, password, confirmPassword },
            validationErrors: errors.array(),
        });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    try {
        await userInvite.populate("user");
        console.log(userInvite);
        const user = userInvite.user;

        user.password = hashedPassword;
        user.active = true;
        await user.save();

        userInvite.claimed = true;
        await userInvite.save();

        res.redirect("/login");
    } catch (err) {
        const error = err;
        error.httpStatusCode = 500;
        return next(error);
    }
};

exports.get2FASetup = async (req, res, next) => {
    if (req.session == null || req.session.token == null) {
        res.redirect("/login");
        return;
    }

    try {
        let apires = await BackendAPI.GET_APICall_Token(
            "/api/v1/account/users/me",
            req.session.token
        );

        const user = apires.user;

        if (user == null) {
            res.redirect("/login");
            return;
        }

        if (user.twoFAState.twoFASetup == true) {
            res.redirect("/login");
            return;
        }

        apires = await BackendAPI.POST_APICall_Token(
            "/api/v1/account/users/me/twofa/generate",
            req.session.token
        );

        const secret = apires.secret;

        let errorMessage = req.flash("error");
        errorMessage.length > 0
            ? (errorMessage = errorMessage[0])
            : (errorMessage = null);

        QRCode.toDataURL(
            authenticator.keyuri(user.email, "SSM Cloud", secret),
            (err, url) => {
                const errorMessageData = {
                    section: "",
                    message: err ? err.message : "",
                };

                res.render("auth/2fa_setup.ejs", {
                    path: "/2fa/setup",
                    pageTitle: "Setup 2FA",
                    QRCODE: url,
                    errorMessage: err
                        ? JSON.stringify(errorMessageData)
                        : errorMessage,
                });
            }
        );
    } catch (err) {
        const errorMessageData = {
            section: "",
            message: err.message,
        };

        res.render("auth/2fa_setup.ejs", {
            path: "/2fa/setup",
            pageTitle: "Setup 2FA",
            QRCODE: "",
            errorMessage: JSON.stringify(errorMessageData),
        });
    }
};

exports.post2faSetup = async (req, res, next) => {
    const post = req.body;
    const token = post.token;
    if (req.session == null || req.session.token == null) {
        res.redirect("/login");
        return;
    }

    try {
        let apires = await BackendAPI.GET_APICall_Token(
            "/api/v1/account/users/me",
            req.session.token
        );

        const user = apires.user;

        if (user == null) {
            res.redirect("/login");
            return;
        }

        if (user.twoFAState.twoFASetup == true) {
            res.redirect("/login");
            return;
        }

        await BackendAPI.POST_APICall_Token(
            "/api/v1/account/users/me/twofa/validate",
            req.session.token,
            { token }
        );

        res.redirect("/login");
    } catch (err) {
        console.log(err);
        const errorMessageData = {
            section: "",
            message: err.message,
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/2fa/setup");
    }
};

exports.get2FAValidate = async (req, res, next) => {
    if (req.session == null || req.session.token == null) {
        res.redirect("/login");
        return;
    }

    let message = req.flash("success");
    message.length > 0 ? (message = message[0]) : (message = null);

    let errorMessage = req.flash("error");
    errorMessage.length > 0
        ? (errorMessage = errorMessage[0])
        : (errorMessage = null);

    res.render("auth/2fa_validate.ejs", {
        path: "/2fa/validate",
        pageTitle: "Validate 2FA",
        errorMessage,
    });
};

exports.post2FAValidate = async (req, res, next) => {
    const post = req.body;
    const token = post.token;
    if (req.session == null || req.session.token == null) {
        res.redirect("/login");
        return;
    }

    try {
        let apires = await BackendAPI.GET_APICall_Token(
            "/api/v1/account/users/me",
            req.session.token
        );

        const user = apires.user;

        if (user == null) {
            res.redirect("/login");
            return;
        }

        if (user.twoFAState.twoFASetup == false) {
            res.redirect("/login");
            return;
        }

        await BackendAPI.POST_APICall_Token(
            "/api/v1/account/users/me/twofa/validate",
            req.session.token,
            { token }
        );
    } catch (err) {
        const errorMessageData = {
            section: "",
            message: err.message,
        };

        req.flash("error", JSON.stringify(errorMessageData));
        return res.redirect("/2fa/validate");
    }

    req.session.isLoggedIn = true;

    await req.session.save();

    res.redirect("/dashboard");
};
