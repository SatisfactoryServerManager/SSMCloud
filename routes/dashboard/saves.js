const path = require("path");

const express = require("express");
const isAuth = require("../../middleware/is-auth");
const dashboardController = require("../../controllers/dashboard");

const { check, body } = require("express-validator");

const router = express.Router();
router.get("/", isAuth, dashboardController.getSaves);

router.post("/", isAuth, dashboardController.postSaves);

router.get(
    "/download/:agentId/:fileName",
    isAuth,
    dashboardController.getDownloadSave
);

module.exports = router;
