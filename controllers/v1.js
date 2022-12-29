const Account = require("../models/account");
const ApiKey = require("../models/apikey");
const User = require("../models/user");

exports.postLogin = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email }).select("+password");

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
