const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const accountEventSchema = new Schema({
    eventType: {
        type: String,
        required: true,
    },
    eventMessage: {
        type: String,
        required: true,
    },
    eventDate: {
        type: Date,
        default: Date.now,
    },
    importance: {
        type: Number,
        default: 0,
    },
});

module.exports = mongoose.model("AccountEvent", accountEventSchema);
