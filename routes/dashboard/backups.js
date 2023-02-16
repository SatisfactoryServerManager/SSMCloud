const path = require("path");

const express = require("express");
const isAuth = require("../../middleware/is-auth");
const dashboardController = require("../../controllers/dashboard");

const { check, body } = require("express-validator");

const router = express.Router();

router.get("/", isAuth, dashboardController.getBackups);

router.get(
    "/download/:backupId",
    isAuth,
    dashboardController.getDownloadBackup
);

module.exports = router;
