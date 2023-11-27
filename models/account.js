const mongoose = require("mongoose");
const Agent = require("./agent");
const User = require("./user");
const UserRole = require("./user_role");
const UserInvites = require("./user_invite");
const ApiKey = require("./apikey");
const AccountIntergrations = require("./account_intergrations");
const IntergrationNotification = require("./intergration_notification");
const AccountEvent = require("./account_event");

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
    intergrations: [
        {
            type: Schema.Types.ObjectId,
            ref: "AccountIntergrations",
        },
    ],

    notifications: {
        type: [
            {
                type: Schema.Types.ObjectId,
                ref: "IntergrationNotification",
            },
        ],
        select: false,
    },
    creationDate: {
        type: Date,
        default: Date.now,
    },
    events: [
        {
            type: Schema.Types.ObjectId,
            ref: "AccountEvent",
        },
    ],
});

accountSchema.methods.CreateEvent = async function (type, message, importance) {
    const newEvent = await AccountEvent.create({
        eventType: type,
        eventMessage: message,
        importance: importance,
    });

    this.events.push(newEvent);
    await this.save();
};

module.exports = mongoose.model("Account", accountSchema);
