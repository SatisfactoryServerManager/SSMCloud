const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ApiKeySchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    key: {
        type: String,
        required: true,
    },
    creationDate: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("ApiKey", ApiKeySchema);
