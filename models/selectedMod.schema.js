const { Schema } = require("mongoose");

const selectedModSchema = new Schema({
    mod: {
        type: Schema.Types.ObjectId,
        ref: "Mod",
    },
    desiredVersion: {
        type: String,
        required: true,
    },
    installedVersion: {
        type: String,
        default: "0.0.0",
    },
    installed: {
        type: Boolean,
        default: false,
    },
    needsUpdate: {
        type: Boolean,
        default: false,
    },
});

module.exports = selectedModSchema;
