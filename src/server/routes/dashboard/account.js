import express from "express";
import { IsAuth } from "../../middleware/is-auth.js";

import {
    getAccount,
    getAccountUsers,
    getAccountAudit,
    postAccountUser,
} from "../../controllers/dashboard/account.js";

const router = express.Router();

router.get("/", IsAuth, getAccount);

router.get("/users", IsAuth, getAccountUsers);

router.post("/users", IsAuth, postAccountUser);

router.get("/audit", getAccountAudit);

export default router;
