const crypto = require("crypto");

const bcrypt = require("bcryptjs");
const Account = require("../models/account");
const User = require("../models/user");
const UserInvite = require("../models/user_invite");
const UserRole = require("../models/user_role");
const Permission = require("../models/permission");

var ObjectId = require("mongoose").Types.ObjectId;

const { validationResult } = require("express-validator");

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
        const user = await user.findOne({ email }).select("+password");

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

        const doMatch = await bcrypt.compare(password, user.password);

        if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((err) => {
                if (err) {
                    console.log(err);
                }
                res.redirect("/dashboard");
            });
        } else {
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
    });

    theAccount.users[0].role = AdminUserRole;

    await theAccount.users[0].save();

    theAccount.userRoles.push(AdminUserRole);
};
