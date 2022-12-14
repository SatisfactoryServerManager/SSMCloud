const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const agentSaveSchema = new Schema({
    sessionName: {
        type: String,
        required: true,
    },
    fileName: {
        type: String,
        required: true,
    },
    level: {
        type: String,
        required: true,
    },
    uploadDate: {
        type: Date,
        default: Date.now,
    },

    stats: {
        type: Object,
        default: {},
    },
    mods: [
        {
            type: Object,
            default: {},
        },
    ],
});

module.exports = mongoose.model("AgentSave", agentSaveSchema);
