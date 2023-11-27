const mongoose = require("mongoose");

const IntergrationEventType = require("./intergration_event_type");

const Schema = mongoose.Schema;

const accountIntergrationsSchema = new Schema({
    eventTypes: [
        {
            type: Schema.Types.ObjectId,
            ref: "IntergrationEventType",
        },
    ],
    type: {
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
    "AccountIntergrations",
    accountIntergrationsSchema
);
