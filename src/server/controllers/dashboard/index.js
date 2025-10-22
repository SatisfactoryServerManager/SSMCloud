import fs from "fs-extra";
import path from "path";

import Config from "../../server_config.js";
import BackendAPI from "../../utils/backend-api.js";

export async function getServerAction(req, res, next) {
    const { agentid, action } = req.params;

    try {
        if (action != "start" && action != "stop" && action != "kill" && action != "install" && action != "update") {
            throw new Error("Invalid server action");
        }

        const theAccount = await BackendAPI.GetAccount(req.session.token);

        if (theAccount == null) {
            throw new Error("Account is null!");
        }

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
            case "install":
                actionString = "installsfserver";
                break;
            case "update":
                actionString = "updatesfserver";
                break;
        }

        await BackendAPI.CreateAgentTask(req.session.token, agentid, {
            action: actionString,
        });

        const successMessageData = {
            agentId: agentid,
            message: "Server Action was successfully sent to the server and will run in the background.",
        };

        req.flash("success", JSON.stringify(successMessageData));
    } catch (err) {
        const errorMessageData = {
            agentId: agentid,
            message: err.message,
        };

        req.flash("error", JSON.stringify(errorMessageData));
    }
    res.redirect("/dashboard");
}

export async function postSaves(req, res, next) {
    const { agentid } = req.params;

    const file = req.file;

    try {
        const theAccount = await BackendAPI.GetAccount(req.session.token);
        const theAgent = await BackendAPI.GetAgentById(req.session.token, agentid);

        if (theAccount == null) {
            throw new Error("Account was null");
        }

        if (theAgent == null) {
            throw new Error("Agent was null");
        }

        if (file == null) {
            throw new Error("No save file was selected");
        }
        const newFileDir = path.join(Config.get("ssm.uploadsdir"), theAccount._id, theAgent._id, "saves");

        fs.ensureDirSync(newFileDir);

        const newFilePath = path.join(newFileDir, file.originalname);

        if (fs.existsSync(newFilePath)) {
            fs.unlinkSync(newFilePath);
        }

        fs.writeFileSync(newFilePath, file.buffer, "binary");

        await BackendAPI.FILE_APICall_Token(`/api/v1/account/agents/upload/${agentid}/save`, newFilePath, req.session.token);

        await BackendAPI.CreateAgentTask(req.session.token, agentid, {
            action: "downloadSave",
            data: {
                saveFile: file.originalname,
            },
        });

        const successMessageData = {
            section: "serverlist",
            message: `Save file has been successfully uploaded, transfering save file to Server in the background.`,
        };

        req.flash("success", JSON.stringify(successMessageData));
    } catch (err) {
        const errorMessageData = {
            section: "serverlist",
            message: err.message,
        };

        req.flash("error", JSON.stringify(errorMessageData));
        console.log(err);
    }

    return res.redirect(`/dashboard/servers/${agentid}`);
}

export async function getIntegrationsPage(req, res, next) {
    try {
        const theAccount = await BackendAPI.GetAccount(req.session.token);
        const agents = await BackendAPI.GetAgents(req.session.token);
        const integrations = await BackendAPI.GetAccountIntegrations(req.session.token);

        res.render("dashboard/integrations", {
            path: "/integrations",
            pageTitle: "Integrations",
            accountName: theAccount.accountName,
            agents: agents,
            integrations: integrations,
            notifications: [],
            eventTypes: [],
            message: "",
            errorMessage: "",
        });
    } catch (err) {
        res.render("dashboard/integrations", {
            path: "/integrations",
            pageTitle: "Integrations",
            accountName: "",
            agents: [],
            integrations: [],
            message,
            errorMessage: err.message,
        });
    }
}

export async function postUpdateIntegration(req, res, next) {
    try {
        const data = req.body;

        const { integrationId } = req.params;
        const eventTypes = [];
        for (let i = 0; i < data.eventTypes.length; i++) {
            eventTypes.push(Number(data.eventTypes[i]));
        }

        const postData = {
            _id: integrationId,
            type: parseInt(data.sel_type),
            eventTypes,
            url: data.inp_url,
        };

        console.log(postData);

        await BackendAPI.PutAccountIntegration(req.session.token, postData);

        return res.json({
            success: true,
        });
    } catch (err) {
        return res.json({
            success: false,
            error: err.message,
        });
    }
}

export async function postNewIntegration(req, res, next) {
    try {
        const data = req.body;

        const eventTypes = [];
        for (let i = 0; i < data.eventTypes.length; i++) {
            eventTypes.push(Number(data.eventTypes[i]));
        }

        const postData = {
            type: parseInt(data.sel_type),
            eventTypes,
            url: data.inp_url,
        };

        await BackendAPI.PostAccountIntegration(req.session.token, postData);

        return res.json({
            success: true,
        });
    } catch (err) {
        return res.json({
            success: false,
            error: err.message,
        });
    }
}

export async function getDeleteIntegration(req, res, next) {
    try {
        const { integrationId } = req.params;

        await BackendAPI.DeleteAccountIntegration(req.session.token, integrationId);
    } catch (err) {
        console.log(err);
    }

    return res.redirect("/dashboard/integrations");
}

export async function postProfileApiKey(req, res, next) {
    try {
        const { inp_new_apikey } = req.body;
        await BackendAPI.PostUserApiKey(req.session.token, inp_new_apikey);
    } catch (err) {
        console.log(err);
    }

    return res.redirect("/dashboard/profile");
}

export async function deleteProfileApiKey(req, res, next) {
    try {
        const { shortkey } = req.params;
        await BackendAPI.DeleteUserApiKey(req.session.token, shortkey);
    } catch (err) {
        console.log(err);
    }

    return res.redirect("/dashboard/profile");
}
