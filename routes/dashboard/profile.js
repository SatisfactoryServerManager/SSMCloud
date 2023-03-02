const path = require("path");

const express = require("express");
const isAuth = require("../../middleware/is-auth");
const dashboardController = require("../../controllers/dashboard");

const { check, body } = require("express-validator");

const router = express.Router();

router.get("/", isAuth, dashboardController.getProfile);

router.get("/image", isAuth, dashboardController.getProfileImage);

module.exports = router;
