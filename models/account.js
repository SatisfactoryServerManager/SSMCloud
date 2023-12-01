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
    state: {
        type: Object,
        default: {
            inactive: false,
            inactivityDate: null,
        },
    },
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

const _preDelete = async function () {
    const doc = await this.model
        .findOne(this.getFilter())
        .select("+notifications");

    if (doc == null) return;

    for (let si = 0; si < doc.users.length; si++) {
        const o = doc.users[si];
        await User.deleteOne({ _id: o });
    }

    for (let si = 0; si < doc.agents.length; si++) {
        const o = doc.agents[si];
        await Agent.deleteOne({ _id: o });
    }

    for (let si = 0; si < doc.userRoles.length; si++) {
        const o = doc.userRoles[si];
        await UserRole.deleteOne({ _id: o });
    }

    for (let si = 0; si < doc.userInvites.length; si++) {
        const o = doc.userInvites[si];
        await UserInvites.deleteOne({ _id: o });
    }

    for (let si = 0; si < doc.apiKeys.length; si++) {
        const o = doc.apiKeys[si];
        await ApiKey.deleteOne({ _id: o });
    }

    for (let si = 0; si < doc.intergrations.length; si++) {
        const o = doc.intergrations[si];
        await AccountIntergrations.deleteOne({ _id: o });
    }

    for (let si = 0; si < doc.notifications.length; si++) {
        const o = doc.notifications[si];
        await IntergrationNotification.deleteOne({ _id: o });
    }

    for (let si = 0; si < doc.events.length; si++) {
        const o = doc.events[si];
        await AccountEvent.deleteOne({ _id: o });
    }
};

accountSchema.pre("deleteOne", { document: true, query: true }, _preDelete);
accountSchema.pre("deleteMany", { document: true, query: true }, _preDelete);

module.exports = mongoose.model("Account", accountSchema);
