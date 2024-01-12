const path = require("path");

const express = require("express");
const isAuth = require("../../middleware/is-auth");
const dashboardController = require("../../controllers/dashboard");

const { check, body } = require("express-validator");

const router = express.Router();

router.get("/", isAuth, dashboardController.getIntegrationsPage);

router.post(
    "/update/:settingsId",
    isAuth,
    dashboardController.postUpdateNotificationSettings
);

router.post("/add", isAuth, dashboardController.postNewNotitifcationSettings);

router.get(
    "/delete/:settingsId",
    isAuth,
    dashboardController.getDeleteNotificationSettings
);

module.exports = router;
