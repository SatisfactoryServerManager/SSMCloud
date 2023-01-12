const mongoose = require("mongoose");

const NotificationEventType = require("./notification_event_type");

const Schema = mongoose.Schema;

const accountNotificationSettingSchema = new Schema({
    eventTypes: [
        {
            type: Schema.Types.ObjectId,
            ref: "NotificationEventType",
        },
    ],
    notificationType: {
        type: String,
        default: "webhook",
    },
    url: {
        type: String,
        default: "",
    },
    data: {
        type: Object,
        default: {},
    },
});

module.exports = mongoose.model(
    "AccountNotificationSetting",
    accountNotificationSettingSchema
);
