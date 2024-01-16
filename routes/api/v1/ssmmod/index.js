const path = require("path");

const express = require("express");
const isAgent = require("../../../../middleware/is-agent");

const SSMController = require("../../../../controllers/ssmmod");

const router = express.Router();

router.post("/players", isAgent, SSMController.postPlayers);
router.post("/buildings", isAgent, SSMController.postBuildings);

module.exports = router;
