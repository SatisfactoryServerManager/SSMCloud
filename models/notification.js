const mongoose = require("mongoose");

const AccountNotificationSetting = require("./account_notification_setting");
const NotificationEvent = require("./notification_event");

const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    notificationSetting: {
        type: Schema.Types.ObjectId,
        ref: "AccountNotificationSetting",
    },
    eventType: {
        type: Schema.Types.ObjectId,
        ref: "NotificationEventType",
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
            ref: "NotificationEvent",
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

module.exports = mongoose.model("Notification", notificationSchema);
