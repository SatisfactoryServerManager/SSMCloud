const https = require("https");

const Config = require("../../server/server_config");
const BackendAPI = require("../../utils/backend-api");

exports.getDownloadBackup = async (req, res, next) => {
    const { agentid, uuid } = req.query;

    try {
        const theAccount = await BackendAPI.GetAccount(req.session.token);
        const theAgent = await BackendAPI.GetAgentById(
            req.session.token,
            agentid
        );

        if (theAccount == null) {
            throw new Error("Account was null");
        }

        if (theAgent == null) {
            throw new Error("Agent was null");
        }

        const theBackup = theAgent.backups.find((b) => b.uuid == uuid);

        if (theBackup == null) {
            throw new Error("Backup was null");
        }

        const url = `${Config.get("ssm.backend.url")}/api/v1/account/agents/${
            theAgent._id
        }/download/backup/${uuid}`;

        require("request")
            .get(url, {
                headers: { "x-ssm-jwt": req.session.token },
            })
            .pipe(res);
    } catch (err) {
        next(err);
    }
};

exports.getDownloadSave = async (req, res, next) => {
    const { agentid, uuid } = req.query;

    try {
        const theAccount = await BackendAPI.GetAccount(req.session.token);
        const theAgent = await BackendAPI.GetAgentById(
            req.session.token,
            agentid
        );

        if (theAccount == null) {
            throw new Error("Account was null");
        }

        if (theAgent == null) {
            throw new Error("Agent was null");
        }

        const theSave = theAgent.saves.find((b) => b.uuid == uuid);

        if (theSave == null) {
            throw new Error("Save was null");
        }

        const url = `${Config.get("ssm.backend.url")}/api/v1/account/agents/${
            theAgent._id
        }/download/save/${uuid}`;

        require("request")
            .get(url, {
                headers: { "x-ssm-jwt": req.session.token },
            })
            .pipe(res);
    } catch (err) {
        next(err);
    }
};

exports.getDownloadLog = async (req, res, next) => {
    const { agentid, type } = req.query;

    try {
        const theAccount = await BackendAPI.GetAccount(req.session.token);
        const theAgent = await BackendAPI.GetAgentById(
            req.session.token,
            agentid
        );

        const logs = await BackendAPI.GetAgentLogs(req.session.token, agentid);

        if (theAccount == null) {
            throw new Error("Account was null");
        }

        if (theAgent == null) {
            throw new Error("Agent was null");
        }

        const theLog = logs.find((b) => b.type == type);

        if (theLog == null) {
            throw new Error("Log was null");
        }

        const url = `${Config.get("ssm.backend.url")}/api/v1/account/agents/${
            theAgent._id
        }/download/log/${type}`;

        require("request")
            .get(url, {
                headers: { "x-ssm-jwt": req.session.token },
            })
            .pipe(res);
    } catch (err) {
        next(err);
    }
};
