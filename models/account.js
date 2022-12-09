const mongoose = require("mongoose");
const Agent = require("./agent");
const User = require("./user");

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
});

module.exports = mongoose.model("Account", accountSchema);
