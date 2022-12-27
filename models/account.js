const mongoose = require("mongoose");
const Agent = require("./agent");
const User = require("./user");
const UserRole = require("./user_role");
const UserInvites = require("./user_invite");
const ApiKey = require("./apikey");

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
});

module.exports = mongoose.model("Account", accountSchema);
