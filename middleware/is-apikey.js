const APIKey = require("../models/apikey");

module.exports = async (req, res, next) => {
    const headers = req.headers;
    const headerKey = headers["x-ssm-key"];
    if (headerKey == null) {
        res.status(403).json({
            success: false,
            error: "API Key is null!",
        });
        return;
    }

    const theApiKey = await APIKey.findOne({ key: headerKey });

    if (theApiKey == null) {
        res.status(403).json({
            success: false,
            error: "API Key is invalid!",
        });
        return;
    }

    req.session.apikey = headerKey;
    req.session.apikeyId = theApiKey._id;

    next();
};
