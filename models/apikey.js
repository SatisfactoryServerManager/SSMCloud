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
});

module.exports = mongoose.model("ApiKey", ApiKeySchema);
