const mongoose = require("mongoose");

const MessageQueueItem = require("./messagequeueitem");
const AgentBackup = require("./agent_backup");
const AgentLogInfo = require("./agent_log_info");

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
            default: {},
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
    },
    { minimize: false }
);

module.exports = mongoose.model("Agent", agentSchema);
