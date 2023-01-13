const path = require("path");

const express = require("express");
const isAuth = require("../middleware/is-auth");
const dashboardController = require("../controllers/dashboard");
const Account = require("../models/account");
const User = require("../models/user");

const { check, body } = require("express-validator");

const router = express.Router();

router.get("/", (req, res, next) => {
    res.render("home.ejs", {});
});

router.get("/dashboard", isAuth, dashboardController.getDashboard);

router.get(
    "/dashboard/serveraction/:agentid/:action",
    isAuth,
    dashboardController.getServerAction
);

router.get("/dashboard/servers", isAuth, dashboardController.getServers);

router.post(
    "/dashboard/servers",
    isAuth,
    [
        body("inp_servername", "Server name must be provided!").isLength({
            min: 4,
            max: 200,
        }),
        body("inp_serverport").custom((value) => {
            if (value < 15777 || value > 15800) {
                throw new Error("Server port must be between 15777 - 15800");
            }
            return true;
        }),
    ],
    dashboardController.postServers
);

router.get("/dashboard/server/:agentid", isAuth, dashboardController.getServer);
router.post(
    "/dashboard/server/:agentid",
    isAuth,
    dashboardController.postServer
);

router.get(
    "/dashboard/server/:agentid/delete",
    isAuth,
    dashboardController.getServerDelete
);

router.get("/dashboard/backups", isAuth, dashboardController.getBackups);
router.get(
    "/dashboard/backups/download/:backupId",
    isAuth,
    dashboardController.getDownloadBackup
);

router.get("/dashboard/account", isAuth, dashboardController.getAccount);

router.get(
    "/dashboard/account/deleteuser/:userId",
    isAuth,
    dashboardController.getDeleteUser
);

router.get(
    "/dashboard/account/deleteinvite/:inviteId",
    isAuth,
    dashboardController.getDeleteUserInvite
);

router.post(
    "/dashboard/account/user",
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
    "/dashboard/account/apikey",
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

router.get("/dashboard/account/apikey", (req, res, next) => {
    res.redirect("/dashboard/account");
});

router.get("/dashboard/saves", isAuth, dashboardController.getSaves);

router.post("/dashboard/saves", isAuth, dashboardController.postSaves);

router.get(
    "/dashboard/saves/download/:agentId/:fileName",
    isAuth,
    dashboardController.getDownloadSave
);

router.get("/dashboard/mods", isAuth, dashboardController.getMods);

router.post(
    "/dashboard/mods/installmod",
    isAuth,
    dashboardController.postInstallMod
);

router.get("/dashboard/logs", isAuth, dashboardController.getLogs);

router.get(
    "/dashboard/notifications",
    isAuth,
    dashboardController.getNotifications
);

module.exports = router;
