import express from "express";
import { IsAuth } from "../../middleware/is-auth.js";
import {
    getProfile,
    getProfileImage,
} from "../../controllers/dashboard/index.js";

const router = express.Router();

router.get("/", IsAuth, getProfile);

router.get("/image", IsAuth, getProfileImage);

export default router;
