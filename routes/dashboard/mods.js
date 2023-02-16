const path = require("path");

const express = require("express");
const isAuth = require("../../middleware/is-auth");
const dashboardController = require("../../controllers/dashboard");

const { check, body } = require("express-validator");

const router = express.Router();

router.get("/", isAuth, dashboardController.getMods);

router.post("/installmod", isAuth, dashboardController.postInstallMod);

router.get(
    "/update/:agentId/:agentModId",
    isAuth,
    dashboardController.getUpdateMod
);

module.exports = router;
