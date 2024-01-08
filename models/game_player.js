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
    online: {
        type: Boolean,
        default: false,
    },
    creationDate: {
        type: Date,
        default: Date.now,
    },
    lastOnlineDate: {
        type: Date,
        default: Date.now,
    },
    location: {
        type: Object,
        default: {
            x: 0,
            y: 0,
            z: 0,
        },
    },
});

module.exports = mongoose.model("GamePlayer", GamePlayerSchema);
