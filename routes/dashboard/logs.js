const path = require("path");

const express = require("express");
const isAuth = require("../../middleware/is-auth");
const dashboardLogsController = require("../../controllers/dashboard/logs");

const { check, body } = require("express-validator");

const router = express.Router();

router.get(
    "/download/:agentId/:logfile",
    isAuth,
    dashboardLogsController.DownloadLog
);

module.exports = router;
