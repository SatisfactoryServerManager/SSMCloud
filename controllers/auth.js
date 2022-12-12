const crypto = require("crypto");

const bcrypt = require("bcryptjs");
const Account = require("../models/account");
const User = require("../models/user");

const { validationResult } = require("express-validator");

exports.getLogin = (req, res) => {
    console.log(res.session);

    if (req.session.isLoggedIn) {
        res.redirect("/dashboard");
    }

    let message = req.flash("error");
    message.length > 0 ? (message = message[0]) : (message = null);

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

exports.postLogin = (req, res, next) => {
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

    User.findOne({ email })
        .then((user) => {
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
            // Validate password. bcrypt can compare password to hashed value, and can determine whether hashed value makes sense, taking into account hashing algorithm used. So if it were hashed, could it result in hashed password?
            bcrypt
                .compare(password, user.password)
                // Will make it into then block regardless of whether passwords match. Result will be a boolean that is true if passwords are equal, false otherwise
                .then((doMatch) => {
                    if (doMatch) {
                        req.session.isLoggedIn = true;
                        req.session.user = user;
                        return req.session.save((err) => {
                            if (err) {
                                console.log(err);
                            }
                            res.redirect("/dashboard");
                        });
                    }
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
                })
                .catch((err) => {
                    console.log(err);
                    res.redirect("/login");
                });
        })
        .catch((err) => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
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
        });
        NewAccount.users.push(newUser);
        await NewAccount.save();
        res.redirect("/login");
    } catch (err) {
        const error = err;
        error.httpStatusCode = 500;
        return next(error);
    }
};
