const Agent = require("../models/agent");

module.exports = async (req, res, next) => {
    const headers = req.headers;
    const headerKey = headers["x-ssm-key"];
    if (headerKey == null) {
        res.json({
            success: false,
            error: "The Agent Key is empty!",
        });
        return;
    }

    const theAgent = await Agent.findOne({ apiKey: headerKey });

    if (theAgent == null) {
        res.json({
            success: false,
            error: "Counldn't find the Agent using the supplied key!",
        });
        return;
    }

    req.agentKey = headerKey;

    next();
};
