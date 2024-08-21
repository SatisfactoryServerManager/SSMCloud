import express from "express";

import { check, body } from "express-validator";

import {
    getLogin,
    postLogin,
    getSignUp,
    postSignUp,
    getAcceptInvite,
    postAcceptInvite,
    getLogout,
    get2FASetup,
    get2FAValidate,
    post2faSetup,
    post2FAValidate,
} from "../controllers/auth.js";

const router = express.Router();

router.get("/login", getLogin);
router.post(
    "/login",
    [
        // Look for specific field but in request body only (unlike check, which looks in all features of incoming request [header, cookie, param, etc.])
        body("email")
            .isEmail()
            .withMessage("Please enter a valid email.")
            // validator.js built-in sanitizer (trims whitespace on sides of email, converts email to lowercase)
            .normalizeEmail(),
        body("password", "Password must be valid.").isLength({
            min: 8,
            max: 100,
        }),
    ],
    postLogin
);

router.get("/signup", getSignUp);
router.post(
    "/signup",
    [
        check("email")
            .isEmail()
            .withMessage("Please enter a valid email.")
            .normalizeEmail(),
        // Adding validation error message as second argument as alternative to using withMessage() after each validator since using message for both checks
        body(
            "password",
            "Please use a password between 8 and 100 characters."
        ).isLength({ min: 8, max: 100 }),
        body("confirmPassword").custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error("Passwords do not match.");
            }
            return true;
        }),
        body("accountName", "Account name must be provided").isLength({
            min: 4,
            max: 200,
        }),
    ],
    postSignUp
);

router.get("/acceptinvite/:invitecode", getAcceptInvite);

router.post(
    "/acceptinvite/:invitecode",
    [
        check("email")
            .isEmail()
            .withMessage("Please enter a valid email.")
            .normalizeEmail(),
        // Adding validation error message as second argument as alternative to using withMessage() after each validator since using message for both checks
        body(
            "password",
            "Please use a password between 8 and 100 characters."
        ).isLength({ min: 8, max: 100 }),
        body("confirmPassword").custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error("Passwords do not match.");
            }
            return true;
        }),
    ],
    postAcceptInvite
);

router.get("/logout", getLogout);

router.get("/2fa/setup", get2FASetup);

router.post("/2fa/setup", post2faSetup);

router.get("/2fa/validate", get2FAValidate);
router.post("/2fa/validate", post2FAValidate);

export default router;
