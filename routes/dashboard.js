const path = require("path");

const express = require("express");
const isAuth = require("../middleware/is-auth");
const dashboardController = require("../controllers/dashboard");

const router = express.Router();

router.get("/dashboard", isAuth, dashboardController.getDashboard);

router.get(
    "/dashboard/serveraction/:agentid/:action",
    isAuth,
    dashboardController.getServerAction
);

module.exports = router;
