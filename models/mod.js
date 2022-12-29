const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ModSchema = new Schema({
    modId: {
        type: String,
        required: true,
    },
    modName: {
        type: String,
        required: true,
    },
    modReference: {
        type: String,
        required: true,
    },
    hidden: {
        type: Boolean,
        default: false,
    },
    logoUrl: {
        type: String,
        default: "/public/images/ssm_logo128_outline.png",
    },
    versions: [
        {
            type: Object,
        },
    ],
});

module.exports = mongoose.model("Mod", ModSchema);
