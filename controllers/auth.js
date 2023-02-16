const crypto = require("crypto");

const bcrypt = require("bcryptjs");
const Account = require("../models/account");
const User = require("../models/user");
const UserInvite = require("../models/user_invite");
const UserRole = require("../models/user_role");
const Permission = require("../models/permission");

var ObjectId = require("mongoose").Types.ObjectId;

const { validationResult } = require("express-validator");

const QRCode = require("qrcode");

const { authenticator } = require("otplib");

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
        oldInput: {
            email: "",
            password: "",
        },
        validationErrors: [],
    });
};

exports.getSignUp = (req, res) => {
    let message = req.flash("error");
    message.length > 0 ? (message = message[0]) : (message = null);

    res.render("auth/signup", {
        path: "/signup",
        pageTitle: "Sign Up",
        errorMessage: message,
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
            oldInput: {
                email,
                password,
            },
            validationErrors: errors.array(),
        });
    }

    try {
        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            return res.status(422).render("auth/login", {
                path: "/login",
                pageTitle: "Log In",
                errorMessage: "Invalid email or password.",
                oldInput: {
                    email,
                    password,
                },
                validationErrors: [],
            });
        }

        const theAccount = await Account.findOne({ users: user });

        if (theAccount == null) {
            return res.status(422).render("auth/login", {
                path: "/login",
                pageTitle: "Log In",
                errorMessage: "Cant find account information!",
                oldInput: {
                    email,
                    password,
                },
                validationErrors: [],
            });
        }

        const ip =
            req.headers["X-Real-IP"] ||
            req.headers["X-Fowarded-For"] ||
            req.socket.remoteAddress;

        await theAccount.CreateEvent(
            "AUTH",
            `Login Attempt for user: [${user.email}] with ip: [${ip}]`,
            0
        );

        const doMatch = await bcrypt.compare(password, user.password);

        if (doMatch) {
            req.session.user = user;
            return req.session.save(async (err) => {
                if (err) {
                    console.log(err);
                }

                if (user.twoFASetup == false) {
                    res.redirect("/2fa/setup");
                } else {
                    res.redirect("/2fa/validate");
                }
            });
        } else {
            await theAccount.CreateEvent(
                "AUTH",
                `Login FAILED for user: [${user.email}] with ip: [${ip}]`,
                5
            );
            return res.status(422).render("auth/login", {
                path: "/login",
                pageTitle: "Log In",
                errorMessage: "Invalid email or password.",
                oldInput: {
                    email,
                    password,
                },
                validationErrors: [],
            });
        }
    } catch (err) {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }
};

exports.postSignUp = async (req, res, next) => {
    const { email, password, confirmPassword, accountName } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render("auth/signup", {
            path: "/signup",
            pageTitle: "Sign Up",
            errorMessage: errors.array()[0].msg,
            oldInput: { email, password, confirmPassword },
            validationErrors: errors.array(),
        });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    try {
        const NewAccount = await Account.create({ accountName });

        const newUser = await User.create({
            email,
            password: hashedPassword,
            isAccountAdmin: true,
            active: true,
        });

        NewAccount.users.push(newUser);

        await CreateAccountUserRoles(NewAccount);

        await NewAccount.save();
        res.redirect("/login");
    } catch (err) {
        const error = err;
        error.httpStatusCode = 500;
        return next(error);
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

    const userInvite = await UserInvite.findOne({ _id: req.params.inviteId });

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

const CreateAccountUserRoles = async (theAccount) => {
    const AllPermissions = await Permission.find();

    const AdminUserRole = await UserRole.create({
        roleName: "Administrator",
        permissions: AllPermissions,
        canEdit: false,
    });

    theAccount.users[0].role = AdminUserRole;
    await theAccount.users[0].save();

    const SuperUserPerms = await Permission.find({
        $or: [
            { permissionName: /page\./ },
            { permissionName: "user.create" },
            { permissionName: "user.update" },
            { permissionName: "userrole.create" },
            { permissionName: "userrole.update" },
            { permissionName: "serveraction.start" },
            { permissionName: "serveraction.stop" },
            { permissionName: "serveraction.kill" },
            { permissionName: /server\./ },
            { permissionName: /mods\./ },
            { permissionName: /saves\./ },
        ],
    });

    const SuperUserRole = await UserRole.create({
        roleName: "Super User",
        permissions: SuperUserPerms,
    });

    theAccount.userRoles.push(AdminUserRole);
    theAccount.userRoles.push(SuperUserRole);
};

exports.get2FASetup = async (req, res, next) => {
    if (req.session == null || req.session.user == null) {
        res.redirect("/login");
        return;
    }

    const user = await User.findOne({ _id: req.session.user._id }).select(
        "+twoFASecret"
    );

    if (user == null) {
        res.redirect("/login");
        return;
    }

    if (user.twoFASetup == true) {
        res.redirect("/login");
        return;
    }

    const secret = authenticator.generateSecret();
    user.twoFASecret = secret;

    await user.save();

    QRCode.toDataURL(
        authenticator.keyuri(user.email, "SSM Cloud", secret),
        (err, url) => {
            if (err) {
                throw err;
            }

            res.render("auth/2fa_setup.ejs", {
                path: "/2fa/setup",
                pageTitle: "Setup 2FA",
                QRCODE: url,
            });
        }
    );
};

exports.post2faSetup = async (req, res, next) => {
    const post = req.body;
    const token = post.token;
    if (req.session == null || req.session.user == null) {
        res.redirect("/login");
        return;
    }

    const user = await User.findOne({ _id: req.session.user._id }).select(
        "+twoFASecret"
    );

    if (user == null) {
        res.redirect("/login");
        return;
    }

    const secret = user.twoFASecret;

    if (!authenticator.check(token, secret)) {
        //redirect back
        console.log("ERROR: 2fa failed Verify", secret);
        return res.redirect("/2fa/setup");
    }

    user.twoFASetup = true;
    await user.save();

    res.redirect("/login");
};

exports.get2FAValidate = async (req, res, next) => {
    if (req.session == null || req.session.user == null) {
        res.redirect("/login");
        return;
    }

    res.render("auth/2fa_validate.ejs", {
        path: "/2fa/validate",
        pageTitle: "Validate 2FA",
    });
};

exports.post2FAValidate = async (req, res, next) => {
    const post = req.body;
    const token = post.token;
    if (req.session == null || req.session.user == null) {
        res.redirect("/login");
        return;
    }

    const user = await User.findOne({ _id: req.session.user._id }).select(
        "+twoFASecret"
    );

    if (user == null) {
        res.redirect("/login");
        return;
    }

    const secret = user.twoFASecret;

    if (!authenticator.check(token, secret)) {
        //redirect back
        console.log("ERROR: 2fa failed Verify", secret);
        return res.redirect("/2fa/validate");
    }

    const theAccount = await Account.findOne({ users: user });

    if (theAccount == null) {
        return res.redirect("/2fa/validate");
    }

    const ip =
        req.headers["X-Real-IP"] ||
        req.headers["X-Fowarded-For"] ||
        req.socket.remoteAddress;

    await theAccount.CreateEvent(
        "AUTH",
        `Login Successful for user: [${user.email}] with ip: [${ip}]`,
        0
    );

    req.session.isLoggedIn = true;

    await req.session.save();

    res.redirect("/dashboard");
};
