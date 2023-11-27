const fs = require("fs-extra");
const path = require("path");
const es = require("event-stream");

const GamePlayerHandler = require("../server/server_game_player_handler");

const Agent = require("../models/agent");
const MessageQueueItem = require("../models/messagequeueitem");
const AgentBackup = require("../models/agent_backup");
const AgentSave = require("../models/agent_save");
const AgentLogInfo = require("../models/agent_log_info");
const Account = require("../models/account");
const ModModel = require("../models/mod");

const AgentHandler = require("../server/server_agent_handler");

const Config = require("../server/server_config");

const NotificationSystem = require("../server/server_notification_system");
const NotificationEventTypeModel = require("../models/intergration_event_type");

const ModManager = require("../server/server_mod_manager");
const AgentModStateModel = require("../models/agent_mod_state.model");

exports.postAgentActiveState = async (req, res, next) => {
    const AgentAPIKey = req.agentKey;

    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

    let EventName = "";
    let fireEvent = false;

    if (theAgent.online && !req.body.active) {
        EventName = "agent.offline";
        fireEvent = true;
    } else if (!theAgent.online && req.body.active) {
        EventName = "agent.online";
        fireEvent = true;
    }

    const theAccount = await Account.findOne({ agents: theAgent._id });

    try {
        if (fireEvent) {
            await NotificationSystem.CreateNotification(
                EventName,
                {
                    account_id: theAccount._id,
                    account_name: theAccount.accountName,
                    agent_id: theAgent._id,
                    agent_name: theAgent.agentName,
                },
                theAccount._id
            );
        }
    } catch (err) {
        console.log(err);
    }

    theAgent.online = req.body.active;
    theAgent.markModified("online");

    const changed = await theAgent.save();

    await AgentHandler.UpdateAgentLastCommDate(theAgent, false);

    res.json({
        success: true,
    });
};

exports.postAgentInstalledState = async (req, res, next) => {
    const AgentAPIKey = req.agentKey;

    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

    theAgent.installed = req.body.installed;
    await theAgent.save();

    await AgentHandler.UpdateAgentLastCommDate(theAgent);

    res.json({
        success: true,
    });
};

exports.postAgentRunningState = async (req, res, next) => {
    const AgentAPIKey = req.agentKey;

    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });
    const theAccount = await Account.findOne({ agents: theAgent._id });

    let EventName = "";
    let fireEvent = false;

    if (theAgent.running && !req.body.running) {
        EventName = "agent.sf.stopped";
        fireEvent = true;
    } else if (!theAgent.running && req.body.running) {
        EventName = "agent.sf.running";
        fireEvent = true;
    }

    try {
        if (fireEvent) {
            await NotificationSystem.CreateNotification(
                EventName,
                {
                    account_id: theAccount._id,
                    account_name: theAccount.accountName,
                    agent_id: theAgent._id,
                    agent_name: theAgent.agentName,
                },
                theAccount._id
            );
        }
    } catch (err) {
        console.log(err);
    }

    theAgent.running = req.body.running;
    theAgent.lastCommDate = Date.now();
    await theAgent.save();

    res.json({
        success: true,
    });
};

exports.postAgentState = async (req, res, next) => {
    const AgentAPIKey = req.agentKey;

    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });
    const theAccount = await Account.findOne({ agents: theAgent._id });

    let EventName = "";
    let fireEvent = false;

    if (theAgent.running && !req.body.running) {
        EventName = "agent.sf.stopped";
        fireEvent = true;
    } else if (!theAgent.running && req.body.running) {
        EventName = "agent.sf.running";
        fireEvent = true;
    }

    try {
        if (fireEvent) {
            await NotificationSystem.CreateNotification(
                EventName,
                {
                    account_id: theAccount._id,
                    account_name: theAccount.accountName,
                    agent_id: theAgent._id,
                    agent_name: theAgent.agentName,
                },
                theAccount._id
            );
        }
    } catch (err) {
        console.log(err);
    }

    theAgent.installed = req.body.installed;
    theAgent.running = req.body.running;
    theAgent.lastCommDate = Date.now();
    theAgent.cpuUsage = req.body.cpu;
    theAgent.ramUsage = req.body.mem;

    await theAgent.save();

    res.json({
        success: true,
    });
};

exports.postAgentCpuMem = async (req, res, next) => {
    const AgentAPIKey = req.agentKey;

    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

    theAgent.cpuUsage = req.body.cpu;
    theAgent.ramUsage = req.body.mem;

    await theAgent.save();

    await AgentHandler.UpdateAgentLastCommDate(theAgent);

    res.json({
        success: true,
    });
};

exports.getAgentMessageQueue = async (req, res, next) => {
    const AgentAPIKey = req.agentKey;

    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey }).select(
        "+messageQueue"
    );

    const queue = await MessageQueueItem.find({
        _id: { $in: theAgent.messageQueue },
        completed: false,
        retries: { $lt: 10 },
    });

    await theAgent.save();
    await AgentHandler.UpdateAgentLastCommDate(theAgent);

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
    const AgentAPIKey = req.agentKey;

    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

    theAgent.config = req.body.config;
    await theAgent.save();

    await AgentHandler.UpdateAgentLastCommDate(theAgent);

    res.json({
        success: true,
    });
};

exports.postConfig = async (req, res, next) => {
    try {
        const AgentAPIKey = req.agentKey;

        const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

        const configData = req.body;

        const theConfig = theAgent.config;

        theConfig.version = configData.version;
        if (theConfig.sfVersions == null) {
            theConfig.sfVersions = {};
            theConfig.backup = {
                interval: 1,
                keep: 24,
                nextbackup: 0,
            };
            theConfig.checkForUpdatesOnStart = true;
            theConfig.workerThreads = 20;
            theConfig.maxPlayers = 4;
            theConfig.sfBranch = "public";
        }

        theConfig.sfVersions.installed = configData.sfinstalledver;
        theConfig.sfVersions.available = configData.sfavailablever;

        theConfig.ip = configData.ipaddress;

        theAgent.config = theConfig;

        theAgent.markModified("config");
        await theAgent.save();

        await AgentHandler.UpdateAgentLastCommDate(theAgent);

        res.json({
            success: true,
        });
    } catch (err) {
        console.log(err);
    }
};

exports.getConfig = async (req, res, next) => {
    const AgentAPIKey = req.agentKey;

    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });
    res.json({
        success: true,
        data: theAgent.config,
    });
};

exports.postUploadBackupFile = async (req, res, next) => {
    try {
        const file = req.file;

        const AgentAPIKey = req.agentKey;
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

        await AgentHandler.UpdateAgentLastCommDate(theAgent);

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
    const AgentAPIKey = req.agentKey;
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

exports.postAgentSaveNewInfo = async (req, res, next) => {
    try {
        const AgentAPIKey = req.agentKey;
        const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

        await theAgent.populate("saves");
        const SaveIdsToRemove = [];

        const data = req.body.saveDatas || [];

        for (let i = 0; i < data.length; i++) {
            const saveSession = data[i];

            const saveFiles = saveSession.saveFiles;

            for (let j = 0; j < saveFiles.length; j++) {
                const saveFile = saveFiles[j];

                const existing = theAgent.saves.find(
                    (s) =>
                        s.sessionName == saveSession.sessionName &&
                        s.fileName == saveFile.fileName
                );

                const modifiedTime = new Date(saveFile.modTime);

                if (existing) {
                    existing.level = saveFile.level;
                    existing.stats = {
                        mtime: modifiedTime,
                        size: saveFile.size,
                    };
                    existing.mods = [];

                    await existing.save();
                } else {
                    const newSave = await AgentSave.create({
                        sessionName: saveSession.sessionName,
                        fileName: saveFile.fileName,
                        level: saveFile.level,
                        stats: {
                            mtime: modifiedTime,
                            size: saveFile.size,
                        },
                        mods: [],
                    });

                    theAgent.saves.push(newSave);
                }
            }
        }

        for (let i = 0; i < theAgent.saves.length; i++) {
            const save = theAgent.saves[i];

            let doesExist = false;

            for (let j = 0; j < data.length; j++) {
                const saveSession = data[j];

                if (save.sessionName != saveSession.sessionName) {
                    continue;
                }

                const saveFiles = saveSession.saveFiles;

                for (let k = 0; k < saveFiles.length; k++) {
                    const saveFile = saveFiles[k];

                    if (save.fileName == saveFile.fileName) {
                        doesExist = true;
                        break;
                    }
                }
            }

            if (!doesExist) {
                SaveIdsToRemove.push(save._id);
                theAgent.saves.splice(i, 1);
            }
        }
        await AgentSave.deleteMany({ _id: { $in: SaveIdsToRemove } });

        await theAgent.save();

        await AgentHandler.UpdateAgentLastCommDate(theAgent);

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

exports.postAgentSaveInfo = async (req, res, next) => {
    const AgentAPIKey = req.agentKey;
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

    await AgentHandler.UpdateAgentLastCommDate(theAgent);

    res.json({
        success: true,
    });
};

exports.postUploadSaveFile = async (req, res, next) => {
    try {
        const file = req.file;

        const AgentAPIKey = req.agentKey;
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

        await AgentHandler.UpdateAgentLastCommDate(theAgent);

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

        const AgentAPIKey = req.agentKey;
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
            logFileData = logFileData.split("-")[0];
        }

        if (theAgent.logs == null) {
            theAgent.logs = {};
        }

        switch (logFileData) {
            case "FactoryGame":
                theLogInfo.FactoryGame = newFilePath;
                theLogInfo.FactoryGameData = await GetLogFileData(newFilePath);
                await theLogInfo.save();

                await GamePlayerHandler.ReadLogForPlayerEvents(
                    theAgent._id,
                    newFilePath
                );
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

        await AgentHandler.UpdateAgentLastCommDate(theAgent);

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

exports.getModsSMLVersions = async (req, res, next) => {
    const data = await ModManager.GetSMLVersionsFromAPI();

    res.status(200).json({
        success: true,
        data,
    });
};

exports.getMod = async (req, res, next) => {
    const modReference = req.params.modReference;

    const theMod = await ModModel.findOne({ modReference: modReference });

    if (theMod == null) {
        res.status(404).json({
            success: false,
            error: `Cant find mod with modReference: ${modReference}`,
        });
        return;
    }

    res.status(200).json({
        success: true,
        data: theMod.toJSON(),
    });
};

exports.getModState = async (req, res, next) => {
    const AgentAPIKey = req.agentKey;
    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

    await theAgent.populate("modState");

    if (theAgent.modState == null) {
        const newModState = await AgentModStateModel.create({});
        theAgent.modState = newModState;
        await theAgent.save();
    }

    for (let i = 0; i < theAgent.modState.selectedMods.length; i++) {
        await theAgent.modState.populate(`selectedMods.${i}.mod`);
    }

    res.status(200).json({
        success: true,
        modState: theAgent.modState,
        data: theAgent.modState,
    });
};

exports.postModState = async (req, res, next) => {
    const AgentAPIKey = req.agentKey;
    const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });

    await theAgent.populate("modState");
    for (let i = 0; i < theAgent.modState.selectedMods.length; i++) {
        await theAgent.modState.populate(`selectedMods.${i}.mod`);
    }

    const newModState = req.body;

    theAgent.modState.installedSMLVersion = newModState.installedSMLVersion;

    for (let i = 0; i < newModState.selectedMods.length; i++) {
        const newSelectedMod = newModState.selectedMods[i];

        const selectedMod = theAgent.modState.selectedMods.find(
            (sm) => sm._id.toString() == newSelectedMod._id
        );

        if (selectedMod == null) continue;

        selectedMod.installed = newSelectedMod.installed;
        selectedMod.installedVersion = newSelectedMod.installedVersion;
    }

    await theAgent.modState.save();

    res.status(200).json({
        success: true,
    });
};

const GetLogFileData = async (LogFile) => {
    if (!fs.existsSync(LogFile)) {
        console.log(`Log Doesn't Exist ${LogFile}`);
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
