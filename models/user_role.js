const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userRoleSchema = new Schema({
    roleName: {
        type: String,
        required: true,
    },
    permissions: [
        {
            type: Schema.Types.ObjectId,
            ref: "Permission",
        },
    ],
    canEdit: {
        type: Boolean,
        default: true,
    },
});

module.exports = mongoose.model("UserRole", userRoleSchema);
