const path = require("path");

const express = require("express");
const isAuth = require("../middleware/is-auth");
const dashboardController = require("../controllers/dashboard");

const { check, body } = require("express-validator");

const router = express.Router();

router.get("/dashboard", isAuth, dashboardController.getDashboard);

router.get(
    "/dashboard/serveraction/:agentid/:action",
    isAuth,
    dashboardController.getServerAction
);

router.get("/dashboard/servers", isAuth, dashboardController.getServers);

router.post(
    "/dashboard/servers",
    isAuth,
    [
        body("inp_servername", "Server name must be provided!").isLength({
            min: 4,
            max: 200,
        }),
        body("inp_serverport").custom((value) => {
            if (value < 15777 || value > 15800) {
                throw new Error("Server port must be between 15777 - 15800");
            }
            return true;
        }),
    ],
    dashboardController.postServers
);

router.get("/dashboard/server/:agentid", isAuth, dashboardController.getServer);

router.get("/dashboard/backups", isAuth, dashboardController.getBackups);

module.exports = router;
