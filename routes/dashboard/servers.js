const path = require("path");

const express = require("express");
const isAuth = require("../../middleware/is-auth");
const dashboardController = require("../../controllers/dashboard");
const dashboardServersController = require("../../controllers/dashboard/servers");

const { check, body } = require("express-validator");
const multer = require("multer");

const Config = require("../../server/server_config");

// SET STORAGE
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, Config.get("ssm.tempdir"));
    },
    filename: function (req, file, cb) {
        cb(null, `${file.originalname}`);
    },
});

const upload = multer({ storage: storage });

const router = express.Router();

router.get("/", isAuth, dashboardServersController.getServers);

router.post(
    "/",
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
    dashboardServersController.postServers
);

router.get("/:agentid", isAuth, dashboardServersController.getServer);

router.post("/:agentid", isAuth, dashboardServersController.postServer);

router.get("/:agentid/js", isAuth, dashboardServersController.getServerJS);

router.post(
    "/:agentid/saves",
    isAuth,
    //upload.single("file"),
    dashboardController.postSaves
);

router.get(
    "/delete/:agentid",
    isAuth,
    dashboardServersController.getServerDelete
);

module.exports = router;
