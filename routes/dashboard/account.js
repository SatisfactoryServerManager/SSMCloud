const path = require("path");

const express = require("express");
const isAuth = require("../../middleware/is-auth");
const User = require("../../models/user");
const dashboardController = require("../../controllers/dashboard");

const { check, body } = require("express-validator");

const router = express.Router();

router.get("/", isAuth, dashboardController.getAccount);

router.get("/deleteuser/:userId", isAuth, dashboardController.getDeleteUser);

router.get(
    "/deleteinvite/:inviteId",
    isAuth,
    dashboardController.getDeleteUserInvite
);

router.post(
    "/user",
    isAuth,
    [
        check("inp_useremail")
            .isEmail()
            .withMessage("Please enter a valid email.")
            // Method found in validator.js docs. validator.js implicitly installed with express-validator
            .custom((value, { req }) => {
                return User.findOne({ email: value }).then((userDoc) => {
                    if (userDoc) {
                        return Promise.reject("Email already in use.");
                    }
                });
            })
            .normalizeEmail(),
        body("inp_userrole")
            // Method found in validator.js docs. validator.js implicitly installed with express-validator
            .custom((value, { req }) => {
                console.log(value, req.body);
                return Account.findOne({
                    users: req.session.user._id,
                    userRoles: value,
                }).then((accountDoc) => {
                    if (accountDoc == null) {
                        return Promise.reject(
                            "User Role Not Attached To Account!"
                        );
                    }
                });
            }),
        // Adding validation error message as second argument as alternative to using withMessage() after each validator since using message for both checks
    ],
    dashboardController.postAccountUser
);

router.post(
    "/apikey",
    isAuth,
    [
        check("inp_user").custom((value, { req }) => {
            return User.findOne({ _id: value }).then((userDoc) => {
                if (!userDoc) {
                    return Promise.reject("Invaild User!");
                }
            });
        }),
    ],
    dashboardController.postAccountApiKey
);

router.get("/apikey", (req, res, next) => {
    res.redirect("/dashboard/account");
});

module.exports = router;
