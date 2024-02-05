const path = require("path");

const express = require("express");
const router = express.Router();
const isAuth = require("../../middleware/is-auth");
const dashboardController = require("../../controllers/dashboard");

router.get("/backup", isAuth, dashboardController.Download.getDownloadBackup);
router.get("/save", isAuth, dashboardController.Download.getDownloadSave);
router.get("/log", isAuth, dashboardController.Download.getDownloadLog);

module.exports = router;
