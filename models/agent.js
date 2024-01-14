const mongoose = require("mongoose");

const MessageQueueItem = require("./messagequeueitem");
const AgentBackup = require("./agent_backup");
const AgentLogInfo = require("./agent_log_info");
const AgentModState = require("./agent_mod_state.model");
const AgentSave = require("./agent_save");
const GamePlayer = require("./game_player");

const Schema = mongoose.Schema;

const agentSchema = new Schema(
    {
        agentName: {
            type: String,
            required: true,
        },
        apiKey: {
            type: String,
            required: true,
            select: false,
        },
        online: {
            type: Boolean,
            default: false,
        },
        installed: {
            type: Boolean,
            default: false,
        },
        running: {
            type: Boolean,
            default: false,
        },
        sfPortNum: {
            type: Number,
            default: 15777,
            required: true,
        },
        memory: {
            type: Number,
            default: 1073741824,
        },
        cpuUsage: {
            type: Number,
            default: 0.0,
        },
        ramUsage: {
            type: Number,
            default: 0.0,
        },
        players: [
            {
                type: Schema.Types.ObjectId,
                ref: "GamePlayer",
            },
        ],
        lastCommDate: {
            type: Date,
            default: Date.now,
        },
        messageQueue: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "MessageQueueItem",
                },
            ],
            select: false,
        },
        config: {
            type: Object,
            default: {
                version: "v0.0.0",
                backup: {
                    keep: 24,
                    interval: 1,
                    nextbackup: 0,
                },
                workerThreads: 20,
                maxPlayers: 4,
                checkForUpdatesOnStart: true,
                autoRestartServer: false,
                autoPause: false,
                autoSaveOnDisconnect: true,
                sfBranch: "public",
                ip: "",
                sfVersions: {
                    installed: 0,
                    available: 0,
                },
            },
        },
        backups: [
            {
                type: Schema.Types.ObjectId,
                ref: "AgentBackup",
            },
        ],
        saves: [
            {
                type: Schema.Types.ObjectId,
                ref: "AgentSave",
            },
        ],
        logInfo: {
            type: Schema.Types.ObjectId,
            ref: "AgentLogInfo",
        },

        modState: {
            type: Schema.Types.ObjectId,
            ref: "AgentModState",
        },

        needsUpdate: {
            type: Boolean,
            default: false,
        },
        creationDate: {
            type: Date,
            default: Date.now,
        },
    },
    { minimize: false }
);

const _preDelete = async function () {
    const doc = await this.model
        .findOne(this.getFilter())
        .select("+messageQueue");

    if (doc == null) return;

    console.log("preDelete", doc._id);

    await AgentModState.deleteOne({ _id: doc.modState });
    await AgentLogInfo.deleteOne({ _id: doc.logInfo });

    for (let si = 0; si < doc.saves.length; si++) {
        const o = doc.saves[si];
        await AgentSave.deleteOne({ _id: o });
    }

    for (let si = 0; si < doc.backups.length; si++) {
        const o = doc.backups[si];
        await AgentBackup.deleteOne({ _id: o });
    }

    for (let si = 0; si < doc.messageQueue.length; si++) {
        const o = doc.messageQueue[si];
        await MessageQueueItem.deleteOne({ _id: o });
    }
    for (let si = 0; si < doc.players.length; si++) {
        const o = doc.players[si];
        await GamePlayer.deleteOne({ _id: o });
    }
};

agentSchema.pre("deleteOne", { document: true, query: true }, _preDelete);
agentSchema.pre("deleteMany", { document: true, query: true }, _preDelete);

module.exports = mongoose.model("Agent", agentSchema);
