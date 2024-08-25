import QRCode from "qrcode";
import { authenticator } from "otplib";
import { validationResult } from "express-validator";

import { verify } from "hcaptcha";

import Config from "../server_config.js";
import BackendAPI from "../utils/backend-api.js";

const verifyHcaptcha = verify;

export async function getLogout(req, res) {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect("/login");
    });
}

export async function getLogin(req, res) {
    if (req.session.isLoggedIn) {
        res.redirect("/dashboard");
        return;
    }

    let message = req.flash("error");
    message.length > 0 ? (message = message[0]) : (message = null);

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
}

export async function getSignUp(req, res) {
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
}

export async function postLogin(req, res, next) {
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
}

export async function postSignUp(req, res, next) {
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
}

export async function getAcceptInvite(req, res, next) {
    try {
        await BackendAPI.GetUserByInviteCode(req.params.invitecode);
    } catch (err) {
        res.render("auth/acceptinvite", {
            path: "/acceptinvite",
            pageTitle: "Accept Invite",
            errorMessage: err.message,
            oldInput: { email: "", password: "", confirmPassword: "" },
            validationErrors: [],
        });
        return;
    }

    res.render("auth/acceptinvite", {
        path: "/acceptinvite",
        pageTitle: "Accept Invite",
        errorMessage: "",
        oldInput: { email: "", password: "", confirmPassword: "" },
        validationErrors: [],
    });
}

export async function postAcceptInvite(req, res, next) {
    const inviteCode = req.params.invitecode;
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

    try {
        const user = await BackendAPI.GetUserByInviteCode(inviteCode);

        if (user.email != email) {
            throw new Error("email doesn't match out records");
        }

        await BackendAPI.PostAcceptInviteCode(inviteCode, password);

        res.redirect("/login");
    } catch (err) {
        res.render("auth/acceptinvite", {
            path: "/acceptinvite",
            pageTitle: "Accept Invite",
            errorMessage: err.message,
            oldInput: { email: "", password: "", confirmPassword: "" },
            validationErrors: [],
        });
        return;
    }
}

export async function get2FASetup(req, res, next) {
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
}

export async function post2faSetup(req, res, next) {
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
}

export async function get2FAValidate(req, res, next) {
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
}

export async function post2FAValidate(req, res, next) {
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
}
