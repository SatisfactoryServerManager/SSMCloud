const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const notificationEventSchema = new Schema({
    eventData: {
        type: Object,
        required: true,
    },
    lastResponseData: {
        type: Object,
        default: {},
    },
    lastResponseCode: {
        type: Number,
        default: 0,
    },
});

module.exports = mongoose.model("NotificationEvent", notificationEventSchema);
