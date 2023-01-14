const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const GamePlayerSchema = new Schema({
    playerName: {
        type: String,
        required: true,
    },
    UUID: {
        type: String,
        default: "",
    },
    state: {
        type: String,
        default: "offline",
    },
    logDate: {
        type: Date,
    },
});

module.exports = mongoose.model("GamePlayer", GamePlayerSchema);
