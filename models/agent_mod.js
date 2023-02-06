const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const agentModSchema = new Schema({
    mod: {
        type: Schema.Types.ObjectId,
        ref: "Mod",
    },
    version: {
        type: String,
        default: "0.0.0",
    },
    needsUpdate: {
        type: Boolean,
        default: false,
    },
});

module.exports = mongoose.model("AgentMod", agentModSchema);
