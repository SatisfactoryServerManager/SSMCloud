const Account = require("../models/account");
const ApiKey = require("../models/apikey");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { authenticator } = require("otplib");

exports.postLogin = async (req, res, next) => {
    const { email, password, otp } = req.body;

    try {
        const user = await User.findOne({ email }).select(
            "+password +twoFASecret"
        );

        if (!user) {
            res.status(404).json({
                success: false,
                apikeys: [],
                error: "Cannot find user account with that email!",
            });
            return;
        }

        const doMatch = await bcrypt.compare(password, user.password);

        if (doMatch) {
            const secret = user.twoFASecret;

            if (!authenticator.check(otp, secret)) {
                res.status(403).json({
                    success: false,
                    apikeys: [],
                    error: "Incorrect 2FA information",
                });
                return;
            }

            const apiKeys = await ApiKey.find({ user: user._id });

            const keyArray = [];

            for (let i = 0; i < apiKeys.length; i++) {
                const key = apiKeys[i];
                keyArray.push(key.key);
            }

            res.status(200).json({
                success: true,
                apikeys: keyArray,
            });
        } else {
            res.status(404).json({
                success: false,
                apikeys: [],
                error: "Invalid email or password.",
            });

            return;
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            apikeys: [],
            error: err.message,
        });
    }
};

exports.getAccount = async (req, res, next) => {
    const apiKey = req.session.apikey;
    const apiKeyId = req.session.apikeyId;

    const theAccount = await Account.findOne({ apiKeys: apiKeyId });

    if (theAccount == null) {
        res.status(404).json({
            success: false,
            account: null,
            error: "Cannot find account with that api key!",
        });
        return;
    }

    await theAccount.populate("users");
    await theAccount.populate("agents");
    await theAccount.populate("userRoles");
    await theAccount.populate("userInvites");
    await theAccount.populate("apiKeys");

    res.status(200).json({
        success: true,
        account: theAccount.toJSON(),
    });
};

exports.putAccount = async (req, res, next) => {
    const { xAccountName } = req.body;

    const apiKey = req.session.apikey;
    const apiKeyId = req.session.apikeyId;

    const theAccount = await Account.findOne({ apiKeys: apiKeyId });

    if (theAccount == null) {
        res.status(404).json({
            success: false,
            account: null,
            error: "Cannot find account with that api key!",
        });
        return;
    }

    if (xAccountName == "" || xAccountName == null) {
        res.status(403).json({
            success: false,
            account: null,
            error: "xAccountName was empty or null!",
        });
        return;
    }

    theAccount.accountName = xAccountName;

    await theAccount.save();

    next();
};

exports.getUsers = async (req, res, next) => {
    const apiKey = req.session.apikey;
    const apiKeyId = req.session.apikeyId;

    const theAccount = await Account.findOne({ apiKeys: apiKeyId });

    if (theAccount == null) {
        res.status(404).json({
            success: false,
            account: null,
            error: "Cannot find account with that api key!",
        });
        return;
    }

    await theAccount.populate("users");

    res.status(200).json({
        success: true,
        users: theAccount.users,
    });
};

exports.getSingleUser = async (req, res, next) => {
    const apiKey = req.session.apikey;
    const apiKeyId = req.session.apikeyId;

    const userid = req.params.userId;

    const theAccount = await Account.findOne({ apiKeys: apiKeyId });

    if (theAccount == null) {
        res.status(404).json({
            success: false,
            account: null,
            error: "Cannot find account with that api key!",
        });
        return;
    }

    await theAccount.populate("users");

    const theUser = theAccount.users.find((u) => u._id == userid);

    if (theUser == null) {
        res.status(404).json({
            success: false,
            account: null,
            error: "Cannot find user with that id!",
        });
        return;
    }

    res.status(200).json({
        success: true,
        user: theUser,
    });
};
