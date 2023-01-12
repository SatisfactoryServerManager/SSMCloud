const express = require("express");
const crypto = require("crypto");

const bcrypt = require("bcryptjs");
const router = express.Router();

const v1Controller = require("../../controllers/v1");
const isApiKey = require("../../middleware/is-apikey");
const rateLimit = require("../../middleware/ratelimit");

router.use(rateLimit.apiLimiter);

router.post("/login", v1Controller.postLogin);

router.get("/account", isApiKey, v1Controller.getAccount);

router.put(
    "/account",
    isApiKey,
    v1Controller.putAccount,
    v1Controller.getAccount
);

router.get("/users", isApiKey, v1Controller.getUsers);
router.get("/users/:userId", isApiKey, v1Controller.getSingleUser);

router.use("*", (req, res, next) => {
    res.status(404).json({
        success: false,
        error: "Endpoint not found!",
    });
});

module.exports = router;
