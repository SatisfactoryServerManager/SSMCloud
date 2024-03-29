const path = require("path");

const express = require("express");
const isAuth = require("../../middleware/is-auth");
const accountController = require("../../controllers/dashboard/account");

const { check, body } = require("express-validator");

const router = express.Router();

router.get("/", isAuth, accountController.getAccount);

router.get("/users", isAuth, accountController.getAccountUsers);

router.post("/users", isAuth, accountController.postAccountUser);

router.get("/audit", accountController.getAccountAudit);

module.exports = router;
