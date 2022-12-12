const express = require("express");

const router = express.Router();
const isAgent = require("../../middleware/is-agent");
const AgentController = require("../../controllers/agent");

router.post("/activestate", isAgent, AgentController.postAgentActiveState);
router.post(
    "/installedstate",
    isAgent,
    AgentController.postAgentInstalledState
);
router.post("/runningstate", isAgent, AgentController.postAgentRunningState);

router.post("/configData", isAgent, AgentController.postUpdateAgentConfigData);

router.post(
    "/messagequeue",
    isAgent,
    AgentController.postUpdateAgentMessageQueueItem
);

router.get("/messagequeue", isAgent, AgentController.getAgentMessageQueue);

router.post("/uploadbackup", isAgent, AgentController.postUploadBackupFile);

module.exports = router;
