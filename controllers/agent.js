const fs = require("fs-extra");
const path = require("path");
const es = require("event-stream");

const Agent = require("../models/agent");
const MessageQueueItem = require("../models/messagequeueitem");
const AgentBackup = require("../models/agent_backup");
const AgentSave = require("../models/agent_save");
const AgentLogInfo = require("../models/agent_log_info");

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

exports.postAgentCpuMem = async (req, res, next) => {
    const AgentAPIKey = req.session.agentKey;

    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

    theAgent.cpuUsage = req.body.cpu;
    theAgent.ramUsage = req.body.mem;

    await theAgent.save();

    res.json({
        success: true,
    });
};

exports.getAgentMessageQueue = async (req, res, next) => {
    const AgentAPIKey = req.session.agentKey;

    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey }).select(
        "+messageQueue"
    );

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

exports.getSaveFile = async (req, res, next) => {
    const AgentAPIKey = req.session.agentKey;
    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

    const filePath = path.join(
        Config.get("ssm.uploadsdir"),
        theAgent._id.toString(),
        "saves",
        req.params.filename
    );

    if (fs.existsSync(filePath)) {
        res.download(filePath);
        return;
    }

    res.status("404").json({
        success: false,
        error: "File Does Not Exist!",
    });
};

exports.postAgentSaveInfo = async (req, res, next) => {
    const AgentAPIKey = req.session.agentKey;
    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

    await theAgent.populate("saves");
    const SaveIdsToRemove = [];

    const data = req.body.saveDatas;

    for (let i = 0; i < data.length; i++) {
        const save = data[i];

        const existing = theAgent.saves.find(
            (s) =>
                s.sessionName == save.sessionName && s.fileName == save.fileName
        );

        if (existing) {
            existing.level = save.level;
            existing.stats = save.stats;
            existing.mods = save.mods;

            await existing.save();
        } else {
            const newSave = await AgentSave.create({
                sessionName: save.sessionName,
                fileName: save.fileName,
                level: save.level,
                stats: save.stats,
                mods: save.mods,
            });

            theAgent.saves.push(newSave);
        }
    }

    for (let i = 0; i < theAgent.saves.length; i++) {
        const save = theAgent.saves[i];
        const existing = data.find(
            (s) =>
                s.sessionName == save.sessionName && s.fileName == save.fileName
        );

        if (existing == null) {
            SaveIdsToRemove.push(save._id);
            theAgent.saves.splice(i, 1);
        }
    }
    await AgentSave.deleteMany({ _id: { $in: SaveIdsToRemove } });

    await theAgent.save();

    res.json({
        success: true,
    });
};

exports.postUploadSaveFile = async (req, res, next) => {
    try {
        const file = req.file;

        const AgentAPIKey = req.session.agentKey;
        const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

        const newFilePath = path.join(
            Config.get("ssm.uploadsdir"),
            theAgent._id.toString(),
            "saves",
            file.originalname
        );

        try {
            if (fs.existsSync(newFilePath)) {
                fs.unlinkSync(newFilePath);
            }

            fs.moveSync(file.path, newFilePath);
        } catch (err) {}

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

exports.postUploadLog = async (req, res, next) => {
    try {
        const file = req.file;

        const AgentAPIKey = req.session.agentKey;
        const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

        const theLogInfo = await AgentLogInfo.findOne({
            _id: theAgent.logInfo,
        });

        if (theLogInfo == null) {
            res.json({
                success: false,
                error: "Log Info is null!",
            });
            return;
        }

        const newFilePath = path.join(
            Config.get("ssm.uploadsdir"),
            theAgent._id.toString(),
            "logs",
            file.originalname
        );

        let logFileData = file.originalname.replace(".log", "");

        if (logFileData != "FactoryGame") {
            logFileData = logFileData.split("-")[1];
        }

        if (theAgent.logs == null) {
            theAgent.logs = {};
        }

        switch (logFileData) {
            case "FactoryGame":
                theLogInfo.FactoryGame = newFilePath;
                theLogInfo.FactoryGameData = await GetLogFileData(newFilePath);
                await theLogInfo.save();
                break;
            case "SSMAgent":
                theLogInfo.SSMAgent = newFilePath;
                theLogInfo.SSMAgentData = await GetLogFileData(newFilePath);
                await theLogInfo.save();
                break;
            case "SSMSteamCMD":
                theLogInfo.SSMSteamCMD = newFilePath;
                theLogInfo.SSMSteamCMDData = await GetLogFileData(newFilePath);
                await theLogInfo.save();
                break;
        }

        try {
            if (fs.existsSync(newFilePath)) {
                fs.unlinkSync(newFilePath);
            }

            fs.moveSync(file.path, newFilePath);
        } catch (err) {}

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

const GetLogFileData = async (LogFile) => {
    if (!fs.existsSync(LogFile)) {
        return;
    }

    let FileData = [];
    const ResData = [];
    await new Promise((resolve, reject) => {
        var s = fs
            .createReadStream(LogFile)
            .pipe(es.split())
            .pipe(
                es
                    .mapSync((line) => {
                        if (line != "") {
                            // pause the readstream
                            s.pause();

                            FileData.push(line);

                            // resume the readstream, possibly from a callback
                            s.resume();
                        }
                    })
                    .on("error", (err) => {
                        reject(err);
                    })
                    .on("end", () => {
                        FileData = FileData.reverse();

                        const lineCount = FileData.length;

                        let maxCount = 500;
                        if (lineCount < maxCount) {
                            maxCount = lineCount;
                        }

                        for (let i = 0; i < maxCount; i++) {
                            ResData.push(FileData[i]);
                        }
                        resolve();
                    })
            );
    });

    return ResData;
};
