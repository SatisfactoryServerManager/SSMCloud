const Agent = require("../models/agent");

module.exports = async (req, res, next) => {
    const headers = req.headers;
    const headerKey = headers["x-ssm-key"];
    if (headerKey == null) {
        res.json({
            success: false,
            error: "Key is null!",
        });
        return;
    }

    const theAgent = await Agent.findOne({ apiKey: headerKey });

    if (theAgent == null) {
        res.json({
            success: false,
            error: "Agent is null!",
        });
        return;
    }

    req.session.agentKey = headerKey;

    next();
};
