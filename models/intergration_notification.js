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

const _preDelete = async function () {
    const doc = await this.model.findOne(this.getFilter());

    if (doc == null) return;

    for (let si = 0; si < doc.events.length; si++) {
        const o = doc.events[si];
        await IntergrationNotificationEvent.deleteOne({ _id: o });
    }
};

IntergrationNotificationSchema.pre(
    "deleteOne",
    { document: true, query: true },
    _preDelete
);
IntergrationNotificationSchema.pre(
    "deleteMany",
    { document: true, query: true },
    _preDelete
);

module.exports = mongoose.model(
    "IntergrationNotification",
    IntergrationNotificationSchema
);
