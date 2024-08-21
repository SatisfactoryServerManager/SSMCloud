import express from "express";
import multer from "multer";
import { body } from "express-validator";

import Config from "../../server_config.js";
import { IsAuth } from "../../middleware/is-auth.js";
import { postSaves } from "../../controllers/dashboard/index.js";

import {
    getServers,
    postServers,
    getServer,
    postServer,
    getServerJS,
    getServerDelete,
} from "../../controllers/dashboard/servers.js";

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

router.get("/", IsAuth, getServers);

router.post(
    "/",
    IsAuth,
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
    postServers
);

router.get("/:agentid", IsAuth, getServer);
router.post("/:agentid", IsAuth, postServer);
router.get("/:agentid/js", IsAuth, getServerJS);
router.post("/:agentid/saves", IsAuth, postSaves);

router.get("/delete/:agentid", IsAuth, getServerDelete);

export default router;
