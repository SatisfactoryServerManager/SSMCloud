const fs = require("fs-extra");
const path = require("path");

const Agent = require("../models/agent");
const MessageQueueItem = require("../models/messagequeueitem");
const AgentBackup = require("../models/agent_backup");

const Config = require("../server/server_config");

exports.postAgentActiveState = async (req, res, next) => {
    const AgentAPIKey = req.session.agentKey;

    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

    theAgent.online = req.body.active;
    theAgent.lastCommDate = Date.now();
    await theAgent.save();

    res.json({
        success: true,
    });
};

exports.postAgentInstalledState = async (req, res, next) => {
    const AgentAPIKey = req.session.agentKey;

    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

    theAgent.installed = req.body.installed;
    theAgent.lastCommDate = Date.now();
    await theAgent.save();

    res.json({
        success: true,
    });
};

exports.postAgentRunningState = async (req, res, next) => {
    const AgentAPIKey = req.session.agentKey;

    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

    theAgent.running = req.body.running;
    theAgent.lastCommDate = Date.now();
    await theAgent.save();

    res.json({
        success: true,
    });
};

exports.getAgentMessageQueue = async (req, res, next) => {
    const AgentAPIKey = req.session.agentKey;

    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

    const queue = await MessageQueueItem.find({
        _id: { $in: theAgent.messageQueue },
        completed: false,
        retries: { $lt: 10 },
    });

    theAgent.lastCommDate = Date.now();
    await theAgent.save();

    res.json({
        success: true,
        data: queue,
    });
};

exports.postUpdateAgentMessageQueueItem = async (req, res, next) => {
    const item = req.body.item;
    const messageItem = await MessageQueueItem.findOne({ _id: item._id });

    if (messageItem) {
        messageItem.completed = item.completed;
        messageItem.error = item.error;
        messageItem.retries = item.retries;
        await messageItem.save();
        res.json({
            success: true,
        });
    } else {
        res.json({
            success: false,
            error: "Unknown Message Queue Item!",
        });
    }
};

exports.postUpdateAgentConfigData = async (req, res, next) => {
    const AgentAPIKey = req.session.agentKey;

    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

    theAgent.config = req.body.config;
    theAgent.lastCommDate = Date.now();
    await theAgent.save();

    res.json({
        success: true,
    });
};

exports.postUploadBackupFile = async (req, res, next) => {
    try {
        const file = req.file;

        const AgentAPIKey = req.session.agentKey;
        const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

        const newFilePath = path.join(
            Config.get("ssm.uploadsdir"),
            theAgent._id.toString(),
            "backups",
            file.originalname
        );

        fs.moveSync(file.path, newFilePath);

        const newBackup = await AgentBackup.create({
            backupName: file.originalname,
            fileName: newFilePath,
            size: file.size,
        });
        theAgent.backups.push(newBackup);
        await theAgent.save();

        res.json({
            success: true,
        });
    } catch (err) {
        console.log(err);
        res.json({
            success: false,
            error: err.message,
        });
    }
};
