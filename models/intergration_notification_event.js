const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const IntergrationNotificationEventSchema = new Schema({
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

module.exports = mongoose.model(
    "IntergrationNotificationEvent",
    IntergrationNotificationEventSchema
);
