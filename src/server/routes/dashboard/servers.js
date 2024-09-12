import express from "express";
import { IsAuth } from "../../middleware/is-auth.js";
import { postSaves } from "../../controllers/dashboard/index.js";

import {
    getServers,
    postServers,
    getServer,
    postServer,
    getServerJS,
    getServerDelete,
    getWorkflow,
} from "../../controllers/dashboard/servers.js";

const router = express.Router();

router.get("/", IsAuth, getServers);
router.post("/", IsAuth, postServers);

router.get("/workflows/:workflowid", IsAuth, getWorkflow);

router.get("/:agentid", IsAuth, getServer);
router.post("/:agentid", IsAuth, postServer);
router.get("/:agentid/js", IsAuth, getServerJS);
router.post("/:agentid/saves", IsAuth, postSaves);
router.get("/delete/:agentid", IsAuth, getServerDelete);

export default router;
