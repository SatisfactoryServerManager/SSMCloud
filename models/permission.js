const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const permissionSchema = new Schema({
    permissionName: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: "",
    },
});

module.exports = mongoose.model("Permission", permissionSchema);
