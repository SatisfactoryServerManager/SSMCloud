import express from "express";

import { IsAuth } from "../../middleware/is-auth.js";

import {
    getDownloadBackup,
    getDownloadLog,
    getDownloadSave,
} from "../../controllers/dashboard/download.js";

const router = express.Router();

router.get("/backup", IsAuth, getDownloadBackup);
router.get("/save", IsAuth, getDownloadSave);
router.get("/log", IsAuth, getDownloadLog);

export default router;
