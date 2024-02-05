var ObjectId = require("mongoose").Types.ObjectId;

const fs = require("fs-extra");

exports.DownloadLog = async (req, res, next) => {
    const agentId = req.params.agentId;
    const logFile = req.params.logfile;

    if (!ObjectId.isValid(req.session.user._id)) {
        const error = new Error("Invalid User ID!");
        error.httpStatusCode = 500;
        return next(error);
    }

    let theUser = await User.findOne({ _id: req.session.user._id });

    const hasPermission = await theUser.HasPermission("page.logs");

    if (!hasPermission) {
        res.status(403).render("403", {
            path: "/dashboard",
            pageTitle: "403 - Forbidden",
            accountName: "",
            agents: [],
            errorMessage: "You dont have permission to view this page.",
        });
        return;
    }

    const theAccount = await Account.findOne({
        users: req.session.user._id,
        agents: agentId,
    });

    if (theAccount) {
        await theAccount.populate("agents");

        for (let i = 0; i < theAccount.agents.length; i++) {
            const agent = theAccount.agents[i];
            await agent.populate("logInfo");
        }

        const theAgent = theAccount.agents.find(
            (agent) => agent._id.toString() == agentId
        );

        if (theAgent == null) {
            const error = new Error("Agent was null!");
            error.httpStatusCode = 500;
            return next(error);
        }

        let logPath = "";
        if (logFile == "SSMLog") {
            logPath = theAgent.logInfo.SSMAgent;
        } else if (logFile == "SteamLog") {
            logPath = theAgent.logInfo.SSMSteamCMD;
        } else if (logFile == "SFLog") {
            logPath = theAgent.logInfo.FactoryGame;
        }

        if (!fs.existsSync(logPath)) {
            res.status(403).render("404", {
                path: "/dashboard",
                pageTitle: "404 - Not Found",
            });
            return;
        }

        res.download(logPath);
    } else {
        res.render("dashboard/logs", {
            path: "/logs",
            pageTitle: "Logs",
            accountName: "",
            agents: [],
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
};
