const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const UserInviteSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    claimed: {
        type: Boolean,
        default: false,
    },
    createdDate: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("UserInvite", UserInviteSchema);
