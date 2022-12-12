var ObjectId = require("mongoose").Types.ObjectId;

const Mrhid6Utils = require("mrhid6utils");
const Tools = Mrhid6Utils.Tools;

const { validationResult } = require("express-validator");

const Account = require("../models/account");
const Agent = require("../models/agent");
const MessageQueueItem = require("../models/messagequeueitem");

exports.getDashboard = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({ users: req.session.user._id });
    if (theAccount) {
        await theAccount.populate("agents");

        res.render("dashboard/dashboard", {
            path: "/dashboard",
            pageTitle: "Dashboard",
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            errorMessage: "",
        });
    } else {
        res.render("dashboard/dashboard", {
            path: "/dashboard",
            pageTitle: "Dashboard",
            accountName: "",
            agents: [],
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};

exports.getServerAction = async (req, res, next) => {
    const { agentid, action } = req.params;

    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    if (!ObjectId.isValid(agentid)) {
        const error = new Error("Invalid Agent ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    if (action != "start" && action != "stop" && action != "kill") {
        const error = new Error("Unknown Server Action!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
        agents: agentid,
    });

    if (theAccount == null) {
        const error = new Error("Cant Find Account details!");
        error.httpStatusCode = 500;
        return next(error);
    }

    await theAccount.populate("agents");

    const theAgent = theAccount.agents.find((agent) => agent._id == agentid);

    let actionString = "";

    switch (action) {
        case "start":
            actionString = "startsfserver";
            break;
        case "stop":
            actionString = "stopsfserver";
            break;
        case "kill":
            actionString = "killsfserver";
            break;
    }

    const message = await MessageQueueItem.create({ action: actionString });
    theAgent.messageQueue.push(message);
    await theAgent.save();

    res.redirect("/dashboard");
};

exports.getServers = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({ users: req.session.user._id });
    if (theAccount) {
        await theAccount.populate("agents");

        res.render("dashboard/servers", {
            path: "/servers",
            pageTitle: "Servers",
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            errorMessage: "",
            newApiKey: "",
            oldInput: {
                inp_servername: "",
                inp_serverport: "",
                inp_servermemory: "",
            },
        });
    } else {
        res.render("dashboard/servers", {
            path: "/servers",
            pageTitle: "Servers",
            accountName: "",
            agents: [],
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
            newApiKey: "",
            oldInput: {
                inp_servername: "",
                inp_serverport: "",
                inp_servermemory: "",
            },
        });
    }
};

exports.postServers = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({ users: req.session.user._id });
    if (theAccount) {
        await theAccount.populate("agents");
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(422).render("dashboard/servers", {
                path: "/servers",
                pageTitle: "Servers",
                accountName: theAccount.accountName,
                agents: theAccount.agents,
                errorMessage: errors.array()[0].msg,
                validationErrors: errors.array(),
                oldInput: {
                    inp_servername: req.body.inp_servername,
                    inp_serverport: req.body.inp_serverport,
                    inp_servermemory: req.body.inp_servermemory,
                },
            });
            return;
        }

        const existingAgentWithName = theAccount.agents.find(
            (agent) => agent.agentName == req.body.inp_servername
        );

        if (existingAgentWithName) {
            res.render("dashboard/servers", {
                path: "/servers",
                pageTitle: "Servers",
                accountName: "",
                agents: theAccount.agents,
                oldInput: {
                    inp_servername: req.body.inp_servername,
                    inp_serverport: req.body.inp_serverport,
                    inp_servermemory: req.body.inp_servermemory,
                },
                errorMessage:
                    "Server with that name already exists on your account!",
                newApiKey: "",
            });
            return;
        }

        const APIKey =
            "AGT-API-" + Tools.generateUUID("XXXXXXXXXXXXXXXXXXXXXXX");

        const newAgent = await Agent.create({
            agentName: req.body.inp_servername,
            sfPortNum: req.body.inp_serverport,
            apiKey: APIKey,
            memory: req.body.inp_servermemory * 1024 * 1024 * 1024,
        });
        theAccount.agents.push(newAgent);
        await theAccount.save();

        res.render("dashboard/servers", {
            path: "/servers",
            pageTitle: "Servers",
            accountName: "",
            agents: theAccount.agents,
            oldInput: {
                inp_servername: req.body.inp_servername,
                inp_serverport: req.body.inp_serverport,
                inp_servermemory: req.body.inp_servermemory,
            },
            errorMessage: "",
            newApiKey: APIKey,
        });
    } else {
        res.render("dashboard/servers", {
            path: "/servers",
            pageTitle: "Servers",
            accountName: "",
            agents: [],
            oldInput: {
                email: "",
                password: "",
            },
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};

exports.getServer = async (req, res, next) => {
    const { agentid } = req.params;

    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    if (!ObjectId.isValid(agentid)) {
        const error = new Error("Invalid Agent ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
        agents: agentid,
    });

    if (theAccount == null) {
        const error = new Error("Cant Find Account details!");
        error.httpStatusCode = 500;
        return next(error);
    }

    await theAccount.populate("agents");

    const theAgent = theAccount.agents.find((agent) => agent._id == agentid);

    if (theAccount) {
        await theAccount.populate("agents");

        res.render("dashboard/server", {
            path: "/server",
            pageTitle: `Server - ${theAgent.agentName}`,
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            agent: theAgent,
            errorMessage: "",
        });
    } else {
        res.render("dashboard/server", {
            path: "/serves",
            pageTitle: "Server",
            accountName: "",
            agents: [],
            agent: {},
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};

exports.getBackups = async (req, res, next) => {
    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    const theAccount = await Account.findOne({ users: req.session.user._id });
    if (theAccount) {
        await theAccount.populate("agents");
        for (let i = 0; i < theAccount.agents.length; i++) {
            const agent = theAccount.agents[i];
            await agent.populate("backups");
        }

        res.render("dashboard/backups", {
            path: "/backups",
            pageTitle: "Backups",
            accountName: theAccount.accountName,
            agents: theAccount.agents,
            errorMessage: "",
            newApiKey: "",
            oldInput: {
                inp_servername: "",
                inp_serverport: "",
                inp_servermemory: "",
            },
        });
    } else {
        res.render("dashboard/backups", {
            path: "/backups",
            pageTitle: "Backups",
            accountName: "",
            agents: [],
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};
