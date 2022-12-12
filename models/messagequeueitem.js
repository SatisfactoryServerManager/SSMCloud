const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const messageQueueItemSchema = new Schema({
    action: {
        type: String,
        required: true,
    },
    data: {
        type: Object,
        default: {},
    },
    completed: {
        type: Boolean,
        default: false,
    },
    error: {
        type: String,
        default: "",
    },
    retries: {
        type: Number,
        default: 0,
    },
});

module.exports = mongoose.model("MessageQueueItem", messageQueueItemSchema);
