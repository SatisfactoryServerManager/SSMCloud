import express from "express";
import path from "path";

import { IsAuth } from "../../middleware/is-auth.js";

import {
    getDashboard,
    getServerAction,
} from "../../controllers/dashboard/index.js";

const router = express.Router();

router.get("/", IsAuth, getDashboard);
router.get("/serveraction/:agentid/:action", IsAuth, getServerAction);

import accountRouter from "./account.js";
import modsRouter from "./mods.js";
import integrationRouter from "./integrations.js";
import serversRouter from "./servers.js";
import profileRouter from "./profile.js";
import downloadRouter from "./download.js";

router.use("/account", accountRouter);
router.use("/mods", modsRouter);
router.use("/integrations", integrationRouter);
router.use("/servers", serversRouter);
router.use("/profile", profileRouter);
router.use("/download", downloadRouter);

export default router;
