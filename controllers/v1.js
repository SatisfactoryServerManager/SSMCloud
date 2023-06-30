var ObjectId = require("mongoose").Types.ObjectId;

const Account = require("../models/account");
const ApiKey = require("../models/apikey");
const User = require("../models/user");
const UserRoleModel = require("../models/user_role");
const UserInvite = require("../models/user_invite");

const Agent = require("../models/agent");
const AgentModStateModel = require("../models/agent_mod_state.model");
const AgentLogInfo = require("../models/agent_log_info");

const Mrhid6Utils = require("mrhid6utils");
const Tools = Mrhid6Utils.Tools;

const bcrypt = require("bcryptjs");
const { authenticator } = require("otplib");

const NotificationSystem = require("../server/server_notification_system");

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
    const apiKey = req.apikey;
    const apiKeyId = req.apikeyId;

    const theKey = await ApiKey.findOne({ key: apiKey });

    let theUser = await User.findOne({ _id: theKey.user._id });

    const hasPermission = await theUser.HasPermission("page.account");

    if (!hasPermission) {
        res.status(403).json({
            success: false,
            error: "403 - Forbidden",
        });
        return;
    }

    const theAccount = await Account.findOne({ apiKeys: apiKeyId });

    if (theAccount == null) {
        res.status(404).json({
            success: false,
            data: null,
            error: "Cannot find account with that api key!",
        });
        return;
    }

    await theAccount.populate("users");
    await theAccount.populate("agents");
    await theAccount.populate("userRoles");
    await theAccount.populate("userInvites");
    await theAccount.populate("apiKeys");
    await theAccount.populate("notificationSettings");

    res.status(200).json({
        success: true,
        data: theAccount.toJSON(),
    });
};

exports.putAccount = async (req, res, next) => {
    const { xAccountName } = req.body;

    const apiKey = req.apikey;
    const apiKeyId = req.apikeyId;

    const theKey = await ApiKey.findOne({ key: apiKey });

    let theUser = await User.findOne({ _id: theKey.user._id });

    const hasPermission = await theUser.HasPermission("page.account");

    if (!hasPermission) {
        res.status(403).json({
            success: false,
            error: "403 - Forbidden",
        });
        return;
    }

    const theAccount = await Account.findOne({ apiKeys: apiKeyId });

    if (theAccount == null) {
        res.status(404).json({
            success: false,
            data: null,
            error: "Cannot find account with that api key!",
        });
        return;
    }

    if (xAccountName == "" || xAccountName == null) {
        res.status(403).json({
            success: false,
            data: null,
            error: "xAccountName was empty or null!",
        });
        return;
    }

    theAccount.accountName = xAccountName;

    await theAccount.save();

    next();
};

exports.getUsers = async (req, res, next) => {
    const apiKey = req.apikey;
    const apiKeyId = req.apikeyId;

    const theKey = await ApiKey.findOne({ key: apiKey });

    let theUser = await User.findOne({ _id: theKey.user._id });

    const hasPermission = await theUser.HasPermission("page.account");

    if (!hasPermission) {
        res.status(403).json({
            success: false,
            error: "403 - Forbidden",
        });
        return;
    }

    const theAccount = await Account.findOne({ apiKeys: apiKeyId });

    if (theAccount == null) {
        res.status(404).json({
            success: false,
            data: null,
            error: "Cannot find account with that api key!",
        });
        return;
    }

    await theAccount.populate("users");

    res.status(200).json({
        success: true,
        data: theAccount.users,
    });
};

exports.getSingleUser = async (req, res, next) => {
    const apiKey = req.apikey;
    const apiKeyId = req.apikeyId;

    const theKey = await ApiKey.findOne({ key: apiKey });

    let requestUser = await User.findOne({ _id: theKey.user._id });

    const hasPermission = await requestUser.HasPermission("page.account");

    if (!hasPermission) {
        res.status(403).json({
            success: false,
            error: "403 - Forbidden",
        });
        return;
    }

    const userid = req.params.userId;

    if (!ObjectId.isValid(userid)) {
        res.status(500).json({
            success: false,
            error: "Invalid User Id Format!",
        });
        return;
    }

    const theAccount = await Account.findOne({ apiKeys: apiKeyId });

    if (theAccount == null) {
        res.status(404).json({
            success: false,
            data: null,
            error: "Cannot find account with that api key!",
        });
        return;
    }

    await theAccount.populate("users");

    const theUser = theAccount.users.find((u) => u._id == userid);

    if (theUser == null) {
        res.status(404).json({
            success: false,
            data: null,
            error: "Cannot find user with that id!",
        });
        return;
    }

    res.status(200).json({
        success: true,
        data: theUser,
    });
};

exports.postUsers = async (req, res, next) => {
    const apiKey = req.apikey;
    const apiKeyId = req.apikeyId;

    const theKey = await ApiKey.findOne({ key: apiKey });

    let requestUser = await User.findOne({ _id: theKey.user._id });

    const hasPermission = await requestUser.HasPermission("user.create");

    if (!hasPermission) {
        res.status(403).json({
            success: false,
            error: "403 - Forbidden",
        });
        return;
    }

    const theAccount = await Account.findOne({ apiKeys: apiKeyId });

    if (theAccount == null) {
        res.status(404).json({
            success: false,
            data: null,
            error: "Cannot find account with that api key!",
        });
        return;
    }

    const data = req.body;

    const missingData = [];

    if (data.xEmail == null || data.xEmail.trim() == "") {
        missingData.push("xEmail");
    }

    if (data.xPassword == null || data.xPassword.trim() == "") {
        missingData.push("xPassword");
    }

    if (data.xConfirmPassword == null || data.xConfirmPassword.trim() == "") {
        missingData.push("xConfirmPassword");
    }

    if (data.xRoleID == null || data.xRoleID.trim() == "") {
        missingData.push("xRoleID");
    }

    if (missingData.length > 0) {
        res.status(400).json({
            success: false,
            error: "Missing required data",
            missingData,
        });
        return;
    }

    if (data.xPassword !== data.xConfirmPassword) {
        res.status(400).json({
            success: false,
            error: "Passwords do not match!",
            missingData,
        });
        return;
    }

    if (!ObjectId.isValid(data.xRoleID)) {
        res.status(500).json({
            success: false,
            error: "Invalid User Role Id Format!",
        });
        return;
    }

    const ExistingUser = await User.findOne({ email: data.xEmail });

    if (ExistingUser) {
        res.status(400).json({
            success: false,
            error: "User with that email address already exists!",
        });
        return;
    }

    const ExistingRole = await UserRoleModel.findOne({ _id: data.xRoleID });

    if (ExistingRole == null) {
        res.status(404).json({
            success: false,
            error: `User Role with ID ${data.xRoleID} dosen't exist!`,
        });
        return;
    }

    try {
        const hashedPassword = await bcrypt.hash(data.xPassword, 12);
        const newUser = await User.create({
            email: data.xEmail,
            password: hashedPassword,
            role: ExistingRole,
            active: data.xActive != null ? data.xActive : false,
        });

        theAccount.users.push(newUser);

        const newInvite = await UserInvite.create({ user: newUser });
        theAccount.userInvites.push(newInvite);
        await theAccount.save();

        const theNewUser = await User.findOne({ _id: newUser._id });

        const protocol = req.protocol;
        const host = req.hostname;

        const inviteUrl = `${protocol}://${host}/acceptinvite/${newInvite._id}`;
        res.status(200).json({
            success: true,
            data: theNewUser,
            inviteUrl,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

exports.getServers = async (req, res, next) => {
    const apiKey = req.apikey;
    const apiKeyId = req.apikeyId;

    const theKey = await ApiKey.findOne({ key: apiKey });

    let theUser = await User.findOne({ _id: theKey.user._id });

    const hasPermission = await theUser.HasPermission("page.servers");

    if (!hasPermission) {
        res.status(403).json({
            success: false,
            error: "403 - Forbidden",
        });
        return;
    }

    const theAccount = await Account.findOne({ apiKeys: apiKeyId });

    if (theAccount == null) {
        res.status(404).json({
            success: false,
            data: null,
            error: "Cannot find account with that api key!",
        });
        return;
    }

    await theAccount.populate("agents");

    res.status(200).json({
        success: true,
        data: theAccount.agents,
    });
};

exports.postServers = async (req, res, next) => {
    const apiKey = req.apikey;
    const apiKeyId = req.apikeyId;

    const theKey = await ApiKey.findOne({ key: apiKey });

    let theUser = await User.findOne({ _id: theKey.user._id });

    const hasPermission = await theUser.HasPermission("server.create");

    if (!hasPermission) {
        res.status(403).json({
            success: false,
            error: "403 - Forbidden",
        });
        return;
    }

    const theAccount = await Account.findOne({ apiKeys: apiKeyId });

    if (theAccount == null) {
        res.status(404).json({
            success: false,
            data: null,
            error: "Cannot find account with that api key!",
        });
        return;
    }

    await theAccount.populate("agents");

    const data = req.body;

    const existingAgentWithName = theAccount.agents.find(
        (agent) => agent.agentName == data.name
    );

    if (existingAgentWithName) {
        return res.status(400).json({
            success: false,
            error: "Server with the same name already exists on this Account!",
        });
    }

    const APIKey = "AGT-API-" + Tools.generateUUID("XXXXXXXXXXXXXXXXXXXXXXX");

    const newLogInfo = await AgentLogInfo.create({});
    const newModState = await AgentModStateModel.create({});

    const newAgent = await Agent.create({
        agentName: data.name,
        sfPortNum: parseInt(data.portOffset || 0) + 15777,
        apiKey: APIKey,
        memory: parseInt(data.memory || 0) * 1024 * 1024 * 1024,
        logInfo: newLogInfo,
        modState: newModState,
    });
    theAccount.agents.push(newAgent);
    await theAccount.save();

    try {
        await NotificationSystem.CreateNotification(
            "agent.created",
            {
                account_id: theAccount._id,
                account_name: theAccount.accountName,
                agent_id: newAgent._id,
                agent_name: newAgent.agentName,
                server_port: newAgent.sfPortNum,
                memory: newAgent.memory,
            },
            theAccount._id
        );
    } catch (err) {
        console.log(err);
    }

    res.status(200).json({
        success: true,
        data: newAgent,
    });
};
