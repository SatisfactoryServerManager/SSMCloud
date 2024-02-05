const path = require("path");

const express = require("express");
const isAuth = require("../../middleware/is-auth");
const dashboardController = require("../../controllers/dashboard");

const router = express.Router();

router.get("/", isAuth, dashboardController.getDashboard);

router.get(
    "/serveraction/:agentid/:action",
    isAuth,
    dashboardController.getServerAction
);
router.use("/account", require("./account"));
router.use("/logs", require("./logs"));
router.use("/mods", require("./mods"));
router.use("/integrations", require("./integrations"));
router.use("/servers", require("./servers"));
router.use("/profile", require("./profile"));
router.use("/download", require("./download"));

module.exports = router;
