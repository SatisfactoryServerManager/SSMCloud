const express = require("express");

const router = express.Router();
const isAgent = require("../../middleware/is-agent");

const Agent = require("../../models/agent");

router.post("/activestate", isAgent, async (req, res, next) => {
    const AgentAPIKey = req.session.agentKey;

    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

    theAgent.online = req.body.active;
    theAgent.lastCommDate = Date.now();
    await theAgent.save();

    res.json({
        success: true,
    });
});

module.exports = router;
