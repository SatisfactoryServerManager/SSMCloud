const express = require("express");

const router = express.Router();
const isAgent = require("../../middleware/is-agent");
const AgentController = require("../../controllers/agent");
const rateLimit = require("../../middleware/ratelimit");

router.use(rateLimit.agentLimiter);

router.post("/activestate", isAgent, AgentController.postAgentActiveState);
router.post(
    "/installedstate",
    isAgent,
    AgentController.postAgentInstalledState
);
router.post("/runningstate", isAgent, AgentController.postAgentRunningState);
router.post("/cpumem", isAgent, AgentController.postAgentCpuMem);

router.post("/configData", isAgent, AgentController.postUpdateAgentConfigData);

router.post(
    "/messagequeue",
    isAgent,
    AgentController.postUpdateAgentMessageQueueItem
);

router.get("/messagequeue", isAgent, AgentController.getAgentMessageQueue);

router.post("/uploadbackup", isAgent, AgentController.postUploadBackupFile);
router.post("/uploadsave", isAgent, AgentController.postUploadSaveFile);

router.get("/saves/download/:filename", isAgent, AgentController.getSaveFile);

router.post("/saves/info", isAgent, AgentController.postAgentSaveInfo);

router.post("/uploadlog", isAgent, AgentController.postUploadLog);

router.get("/getsmlversions", isAgent, AgentController.getModsSMLVersions);

router.get("/mod/:modReference", isAgent, AgentController.getMod);

router.post("/mods", isAgent, AgentController.postInstalledMods);

router.get("/modstate", isAgent, AgentController.getModState);
router.post("/modstate", isAgent, AgentController.postModState);
module.exports = router;
