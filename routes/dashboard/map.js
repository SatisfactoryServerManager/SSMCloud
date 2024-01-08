const path = require("path");

const express = require("express");
const isAuth = require("../../middleware/is-auth");
const dashboardController = require("../../controllers/dashboard");

const router = express.Router();

router.get("/:agentid", isAuth, dashboardController.getMapPage);

module.exports = router;
