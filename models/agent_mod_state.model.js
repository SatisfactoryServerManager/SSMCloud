const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const selectedModSchema = require("./selectedMod.schema");

const agentModStateSchema = new Schema({
    lastestSMLVersion: {
        type: String,
        default: "0.0.0",
    },
    installedSMLVersion: {
        type: String,
        default: "0.0.0",
    },
    selectedMods: [
        {
            type: selectedModSchema,
        },
    ],
});

module.exports = mongoose.model("AgentModState", agentModStateSchema);
