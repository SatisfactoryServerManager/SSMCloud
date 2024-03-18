const express = require("express");
const { check, body } = require("express-validator");

const authController = require("../controllers/auth");
const router = express.Router();

router.get("/login", authController.getLogin);
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
    authController.postLogin
);

router.get("/signup", authController.getSignUp);
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
    authController.postSignUp
);

router.get("/acceptinvite/:invitecode", authController.getAcceptInvite);

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
    authController.postAcceptInvite
);

router.get("/logout", authController.getLogout);

router.get("/2fa/setup", authController.get2FASetup);

router.post("/2fa/setup", authController.post2faSetup);

router.get("/2fa/validate", authController.get2FAValidate);
router.post("/2fa/validate", authController.post2FAValidate);

module.exports = router;
