const mongoose = require("mongoose");

const AccountIntergrations = require("./account_intergrations");
const IntergrationNotificationEvent = require("./intergration_notification_event");

const Schema = mongoose.Schema;

const IntergrationNotificationSchema = new Schema({
    intergration: {
        type: Schema.Types.ObjectId,
        ref: "AccountIntergrations",
    },
    eventType: {
        type: Schema.Types.ObjectId,
        ref: "IntergrationEventType",
    },
    retries: {
        type: Number,
        default: 0,
    },
    completed: {
        type: Boolean,
        default: false,
    },
    failed: {
        type: Boolean,
        default: false,
    },
    error: {
        type: String,
        default: "",
    },
    events: [
        {
            type: Schema.Types.ObjectId,
            ref: "IntergrationNotificationEvent",
        },
    ],
    data: {
        type: Object,
        default: {},
    },
    creationDate: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model(
    "IntergrationNotification",
    IntergrationNotificationSchema
);
