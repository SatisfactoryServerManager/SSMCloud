const path = require("path");

const express = require("express");
const isAuth = require("../../middleware/is-auth");
const dashboardController = require("../../controllers/dashboard");
const dashboardLogsController = require("../../controllers/dashboard/logs");
const dashboardServersController = require("../../controllers/dashboard/servers");
const Account = require("../../models/account");
const User = require("../../models/user");

const { check, body } = require("express-validator");

const router = express.Router();

router.get("/", isAuth, dashboardController.getDashboard);

router.get(
    "/serveraction/:agentid/:action",
    isAuth,
    dashboardController.getServerAction
);
router.use("/account", require("./account"));
router.use("/backups", require("./backups"));
router.use("/logs", require("./logs"));
router.use("/mods", require("./mods"));
router.use("/integrations", require("./integrations"));
router.use("/saves", require("./saves"));
router.use("/servers", require("./servers"));
router.use("/profile", require("./profile"));

module.exports = router;
