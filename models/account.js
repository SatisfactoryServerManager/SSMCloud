const mongoose = require("mongoose");
const Agent = require("./agent");
const User = require("./user");
const UserRole = require("./user_role");
const UserInvites = require("./user_invite");
const ApiKey = require("./apikey");
const AccountNotificationSetting = require("./account_notification_setting");
const Notification = require("./notification");

const Schema = mongoose.Schema;

const accountSchema = new Schema({
    accountName: {
        type: String,
        required: true,
    },
    users: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    agents: [
        {
            type: Schema.Types.ObjectId,
            ref: "Agent",
        },
    ],
    userRoles: [
        {
            type: Schema.Types.ObjectId,
            ref: "UserRole",
        },
    ],
    userInvites: [
        {
            type: Schema.Types.ObjectId,
            ref: "UserInvite",
        },
    ],
    apiKeys: [
        {
            type: Schema.Types.ObjectId,
            ref: "ApiKey",
        },
    ],
    notificationSettings: [
        {
            type: Schema.Types.ObjectId,
            ref: "AccountNotificationSetting",
        },
    ],

    notifications: {
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: "Notification",
            },
        ],
        select: false,
    },
});

module.exports = mongoose.model("Account", accountSchema);
