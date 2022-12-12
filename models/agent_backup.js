const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const agentBackupSchema = new Schema({
    backupName: {
        type: String,
        required: true,
    },
    fileName: {
        type: String,
        required: true,
    },
    uploadDate: {
        type: Date,
        default: Date.now,
    },
    size: {
        type: Number,
        default: 0,
    },
});

module.exports = mongoose.model("AgentBackup", agentBackupSchema);
