const path = require("path");

const express = require("express");
const isAuth = require("../middleware/is-auth");
const dashboardController = require("../controllers/dashboard");
const dashboardLogsController = require("../controllers/dashboard/logs");
const dashboardServersController = require("../controllers/dashboard/servers");
const Account = require("../models/account");
const User = require("../models/user");

const { check, body } = require("express-validator");

const router = express.Router();

router.get("/", (req, res, next) => {
    res.render("home.ejs", {});
});

router.use(require("./auth"));

router.use("/dashboard", require("./dashboard"));

module.exports = router;
