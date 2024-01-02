const mongoose = require("mongoose");
const fs = require("fs-extra");

const Schema = mongoose.Schema;

const agentBackupSchema = new Schema({
    backupName: {
        type: String,
        required: true,
    },
    fileName: {
        type: String,
        required: true,
    },
    uploadDate: {
        type: Date,
        default: Date.now,
    },
    size: {
        type: Number,
        default: 0,
    },
});

const _preDelete = async function () {
    const doc = await this.model.findOne(this.getFilter());

    if (doc == null) return;

    if (fs.existsSync(doc.fileName)) {
        fs.unlinkSync(doc.fileName);
    }
};

agentBackupSchema.pre("deleteOne", { document: true, query: true }, _preDelete);
agentBackupSchema.pre(
    "deleteMany",
    { document: true, query: true },
    _preDelete
);

module.exports = mongoose.model("AgentBackup", agentBackupSchema);
