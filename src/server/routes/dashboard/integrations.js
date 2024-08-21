import express from "express";

import { IsAuth } from "../../middleware/is-auth.js";

import {
    getIntegrationsPage,
    postNewNotitifcationSettings,
    postUpdateNotificationSettings,
    getDeleteNotificationSettings,
} from "../../controllers/dashboard/index.js";

const router = express.Router();

router.get("/", IsAuth, getIntegrationsPage);
router.post("/update/:settingsId", IsAuth, postUpdateNotificationSettings);
router.post("/add", IsAuth, postNewNotitifcationSettings);
router.get("/delete/:settingsId", IsAuth, getDeleteNotificationSettings);

export default router;
