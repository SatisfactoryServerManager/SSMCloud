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

userRoleSchema.methods.HasPermission = async function (permissionName) {
    await this.populate("permissions");
    return (
        this.permissions.find((p) => p.permissionName == permissionName) != null
    );
};

module.exports = mongoose.model("UserRole", userRoleSchema);
