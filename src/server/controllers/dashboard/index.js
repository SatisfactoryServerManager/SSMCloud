import fs from "fs-extra";
import path from "path";

import Config from "../../server_config.js";
import BackendAPI from "../../utils/backend-api.js";

export async function getDashboard(req, res, next) {
    const theAccount = await BackendAPI.GetAccount(req.session.token);

    let message = req.flash("success");
    message.length > 0 ? (message = message[0]) : (message = null);

    if (theAccount) {
        const agents = await BackendAPI.GetAgents(req.session.token);

        res.render("dashboard/dashboard", {
            path: "/dashboard",
            pageTitle: "Dashboard",
            accountName: theAccount.accountName,
            agents,
            errorMessage: "",
            message,
        });
    } else {
        res.render("dashboard/dashboard", {
            path: "/dashboard",
            pageTitle: "Dashboard",
            accountName: "",
            agents: [],
            message,
            errorMessage:
                "Cant Find Account details. Please contact SSM Support.",
        });
    }
}

export async function getServerAction(req, res, next) {
    const { agentid, action } = req.params;

    try {
        if (
            action != "start" &&
            action != "stop" &&
            action != "kill" &&
            action != "install" &&
            action != "update"
        ) {
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
            message:
                "Server Action was successfully sent to the server and will run in the background.",
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
        const theAgent = await BackendAPI.GetAgentById(
            req.session.token,
            agentid
        );

        if (theAccount == null) {
            throw new Error("Account was null");
        }

        if (theAgent == null) {
            throw new Error("Agent was null");
        }

        if (file == null) {
            throw new Error("No save file was selected");
        }
        const newFileDir = path.join(
            Config.get("ssm.uploadsdir"),
            theAccount._id,
            theAgent._id,
            "saves"
        );

        fs.ensureDirSync(newFileDir);

        const newFilePath = path.join(newFileDir, file.originalname);

        if (fs.existsSync(newFilePath)) {
            fs.unlinkSync(newFilePath);
        }

        fs.writeFileSync(newFilePath, file.buffer, "binary");

        await BackendAPI.FILE_APICall_Token(
            `/api/v1/account/agents/upload/${agentid}/save`,
            newFilePath,
            req.session.token
        );

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

export async function postInstallMod(req, res, next) {
    const { agentId, modId } = req.body;

    try {
        const theAccount = await BackendAPI.GetAccount(req.session.token);
        const theAgent = await BackendAPI.GetAgentById(
            req.session.token,
            agentId
        );

        if (theAccount == null) {
            throw new Error("Account was null");
        }

        if (theAgent == null) {
            throw new Error("Agent was null");
        }

        await BackendAPI.InstallAgentMod(req.session.token, agentId, modId);
    } catch (err) {
        console.log(err);
        return res.json({ success: false, error: err.message });
    }

    return res.json({ success: true });
}

export async function postUninstallMod(req, res, next) {
    const { agentId, modId } = req.body;

    try {
        const theAccount = await BackendAPI.GetAccount(req.session.token);
        const theAgent = await BackendAPI.GetAgentById(
            req.session.token,
            agentId
        );

        if (theAccount == null) {
            throw new Error("Account was null");
        }

        if (theAgent == null) {
            throw new Error("Agent was null");
        }

        await BackendAPI.UninstallAgentMod(req.session.token, agentId, modId);
    } catch (err) {
        console.log(err);
        return res.json({ success: false, error: err.message });
    }

    return res.json({ success: true });
}

export async function getIntegrationsPage(req, res, next) {
    try {
        const theAccount = await BackendAPI.GetAccount(req.session.token);
        const agents = await BackendAPI.GetAgents(req.session.token);
        const integrations = await BackendAPI.GetAccountIntegrations(
            req.session.token
        );

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

        await BackendAPI.DeleteAccountIntegration(
            req.session.token,
            integrationId
        );
    } catch (err) {
        console.log(err);
    }

    return res.redirect("/dashboard/integrations");
}

export async function getProfile(req, res, next) {
    try {
        const theAccount = await BackendAPI.GetAccount(req.session.token);
        const agents = await BackendAPI.GetAgents(req.session.token);
        const theUser = await BackendAPI.GetUser(req.session.token);

        let message = req.flash("success");
        message.length > 0 ? (message = message[0]) : (message = null);

        res.render("dashboard/profile", {
            path: "/profile",
            pageTitle: "My Profile",
            accountName: theAccount.accountName,
            agents: agents,
            user: theUser,
            message,
            errorMessage: "",
        });
    } catch (err) {
        res.render("dashboard/profile", {
            path: "/profile",
            pageTitle: "My Profile",
            accountName: "",
            agents: [],
            mods: [],
            message,
            errorMessage: err.message,
        });
    }
}

export async function getProfileImage(req, res, next) {
    try {
        const theUser = await BackendAPI.GetUser(req.session.token);

        let message = req.flash("success");
        message.length > 0 ? (message = message[0]) : (message = null);

        if (theUser.profileImageUrl == "") {
            const imagePath = path.join(
                __basedir,
                "/src/client/public/images/blank-profile-image.png"
            );
            res.sendFile(imagePath);
            return;
        }

        if (!fs.existsSync(theUser.profileImageUrl)) {
            const imagePath = path.join(
                __basedir,
                "/public/images/blank-profile-image.png"
            );
            res.sendFile(imagePath);
            return;
        }

        res.sendFile(theUser.profileImageUrl);
    } catch (err) {
        const imagePath = path.join(
            __basedir,
            "/public/images/blank-profile-image.png"
        );
        res.sendFile(imagePath);
    }
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

export async function getModsJS(req, res, next) {
    try {
        const { page, sort, direction, search, agentid } = req.query;

        let mods = await BackendAPI.GetMods();

        const totalMods = mods.length;

        const theAgent = await BackendAPI.GetAgentById(
            req.session.token,
            agentid
        );

        const selectedMods = theAgent.modConfig.selectedMods;

        for (let i = 0; i < mods.length; i++) {
            const mod = mods[i];
            mod.installed = false;
            mod.needsUpdate = false;
            mod.installedVersion = "0.0.0";
            mod.desiredVersion = "0.0.0";
            mod.pendingInstall = false;

            for (let j = 0; j < selectedMods.length; j++) {
                const selectedMod = selectedMods[j];
                if (mod.mod_reference == selectedMod.mod.mod_reference) {
                    mod.installed = selectedMod.installed;
                    mod.needsUpdate = selectedMod.needsUpdate;
                    mod.installedVersion = selectedMod.installedVersion;
                    mod.desiredVersion = selectedMod.desiredVersion;
                    mod.pendingInstall =
                        selectedMod.desiredVersion !=
                        selectedMod.installedVersion;
                }
            }
        }

        const installedMods = mods.filter((m) => m.installed).length;

        if (search != "") {
            mods = mods.filter((m) => m.name.toLowerCase().includes(search));
        }

        function compareAZ(a, b) {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        }

        function compareInstalled(a, b) {
            if (!a.installed && b.installed) {
                return -1;
            }
            if (a.installed && !b.installed) {
                return 1;
            }
            return 0;
        }

        function compareDownloads(a, b) {
            if (a.downloads < b.downloads) {
                return -1;
            }
            if (a.downloads > b.downloads) {
                return 1;
            }
            return 0;
        }

        function compareUpdated(a, b) {
            const aLatestVersion = a.versions[0];
            const bLatestVersion = b.versions[0];

            const aDate = new Date(aLatestVersion.created_at).getTime();
            const bDate = new Date(bLatestVersion.created_at).getTime();

            if (aDate < bDate) {
                return -1;
            }
            if (aDate > bDate) {
                return 1;
            }
            return 0;
        }

        function compareNeedsUpdate(a, b) {
            if (!a.needsUpdate && b.needsUpdate) {
                return -1;
            }
            if (a.needsUpdate && !b.needsUpdate) {
                return 1;
            }
            return 0;
        }

        if (sort == "az") {
            mods.sort(compareAZ);
        }

        if (sort == "installed") {
            mods.sort(compareInstalled);
        }

        if (sort == "downloads") {
            mods.sort(compareDownloads);
        }

        if (sort == "updated") {
            mods.sort(compareUpdated);
        }

        if (sort == "needsupdate") {
            mods.sort(compareNeedsUpdate);
        }

        if (direction == "desc") {
            mods.reverse();
        }

        const pageLimit = 30;
        let start = 0;
        let end = pageLimit;

        if (mods.length > pageLimit) {
            start = parseInt(page) * pageLimit;
            end = (parseInt(page) + 1) * pageLimit;
        }

        if (mods.length < end) {
            end = mods.length - 1;
        }

        const pages = Math.ceil(mods.length / pageLimit);

        mods = mods.slice(start, end);

        res.json({ success: true, mods, pages, totalMods, installedMods });
    } catch (err) {
        console.log(err);
    }
}
