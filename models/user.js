const mongoose = require("mongoose");
const UserRole = require("./user_role");

const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    isAccountAdmin: {
        type: Boolean,
        default: false,
    },
    role: {
        type: Schema.Types.ObjectId,
        ref: "UserRole",
    },
    active: {
        type: Boolean,
        default: false,
    },
    twoFASecret: {
        type: String,
        select: false,
    },
    twoFASetup: {
        type: Boolean,
        default: false,
    },
    creationDate: {
        type: Date,
        default: Date.now,
    },
});

userSchema.methods.HasPermission = async function (permissionName) {
    await this.populate("role");
    return this.role.HasPermission(permissionName);
};

module.exports = mongoose.model("User", userSchema);
