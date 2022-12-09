const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const agentSchema = new Schema({
    agentName: {
        type: String,
        required: true,
    },
    apiKey: {
        type: String,
        required: true,
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
});

module.exports = mongoose.model("Agent", agentSchema);
