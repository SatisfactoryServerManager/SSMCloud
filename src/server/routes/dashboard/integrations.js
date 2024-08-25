import express from "express";

import { IsAuth } from "../../middleware/is-auth.js";

import {
    getIntegrationsPage,
    postNewIntegration,
    postUpdateIntegration,
    getDeleteIntegration,
} from "../../controllers/dashboard/index.js";

const router = express.Router();

router.get("/", IsAuth, getIntegrationsPage);
router.post("/update/:integrationId", IsAuth, postUpdateIntegration);
router.post("/add", IsAuth, postNewIntegration);
router.get("/delete/:integrationId", IsAuth, getDeleteIntegration);

export default router;
