import express from "express";
import { IsAuth } from "../../middleware/is-auth.js";
import {
    getProfile,
    getProfileImage,
    postProfileApiKey,
    deleteProfileApiKey,
} from "../../controllers/dashboard/index.js";

const router = express.Router();

router.get("/", IsAuth, getProfile);
router.get("/image", IsAuth, getProfileImage);
router.post("/apikey", IsAuth, postProfileApiKey);
router.get("/deletekey/:shortkey", IsAuth, deleteProfileApiKey);

export default router;
