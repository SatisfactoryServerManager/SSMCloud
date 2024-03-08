const path = require("path");

const express = require("express");
const isAuth = require("../../middleware/is-auth");
const accountController = require("../../controllers/dashboard/account");

const { check, body } = require("express-validator");

const router = express.Router();

router.get("/", isAuth, accountController.getAccount);

router.get("/deleteuser/:userId", isAuth, accountController.getDeleteUser);

router.get(
    "/deleteinvite/:inviteId",
    isAuth,
    accountController.getDeleteUserInvite
);

router.get("/users", isAuth, accountController.getAccountUsers);

router.post("/users", isAuth, accountController.postAccountUser);

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
    accountController.postAccountApiKey
);

router.get(
    "/apikey/delete/:apiKeyId",
    isAuth,
    accountController.getDeleteApiKey
);

router.get("/apikey", (req, res, next) => {
    res.redirect("/dashboard/account");
});

router.get("/audit", accountController.getAccountAudit);

module.exports = router;
