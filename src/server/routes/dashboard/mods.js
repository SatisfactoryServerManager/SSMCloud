import express from "express";
import { IsAuth } from "../../middleware/is-auth.js";

import {
    getModsJS,
    postInstallMod,
    postUninstallMod,
} from "../../controllers/dashboard/index.js";

const router = express.Router();

router.get("/", IsAuth, getModsJS);

router.post("/installmod", IsAuth, postInstallMod);

router.post("/uninstallmod", IsAuth, postUninstallMod);

export default router;
