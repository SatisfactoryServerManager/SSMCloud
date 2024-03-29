const Config = require("../server/server_config");

class BackendAPI {
    init() {
        this.url = Config.get("ssm.backend.url");
    }

    GET_APICall_Token = async (endpoint, token = "") => {
        const res = await fetch(`${this.url}${endpoint}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-ssm-jwt": token,
            },
        });

        let resData = await res.text();

        if (res.status != 200) {
            console.log(resData);
            throw new Error(`api returned non-ok status code: ${res.status}`);
        }

        resData = JSON.parse(resData);

        if (resData.success == false) {
            console.log(resData);
            throw new Error(`api returned error ${resData.error}`);
        }

        return resData;
    };

    GET_APICall_NoToken = async (endpoint) => {
        return await this.GET_APICall_Token(endpoint, "");
    };

    POST_APICall_Token = async (endpoint, token = "", body = {}) => {
        const res = await fetch(`${this.url}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-ssm-jwt": token,
            },
            body: JSON.stringify(body),
        });

        let resData = await res.text();

        if (res.status != 200) {
            console.log(resData);
            throw new Error(`api returned non-ok status code: ${res.status}`);
        }

        resData = JSON.parse(resData);

        if (resData.success == false) {
            console.log(resData);
            throw new Error(`api returned error ${resData.error}`);
        }

        return resData;
    };

    POST_APICall_NoToken = async (endpoint, body = {}) => {
        return await this.POST_APICall_Token(endpoint, "", body);
    };

    PUT_APICall_Token = async (endpoint, token = "", body = {}) => {
        const res = await fetch(`${this.url}${endpoint}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "x-ssm-jwt": token,
            },
            body: JSON.stringify(body),
        });

        let resData = await res.text();

        if (res.status != 200) {
            console.log(resData);
            throw new Error(`api returned non-ok status code: ${res.status}`);
        }

        resData = JSON.parse(resData);

        if (resData.success == false) {
            console.log(resData);
            throw new Error(`api returned error ${resData.error}`);
        }

        return resData;
    };

    DELETE_APICall_Token = async (endpoint, token = "") => {
        const res = await fetch(`${this.url}${endpoint}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "x-ssm-jwt": token,
            },
        });

        let resData = await res.text();

        if (res.status != 200) {
            console.log(resData);
            throw new Error(`api returned non-ok status code: ${res.status}`);
        }

        resData = JSON.parse(resData);

        if (resData.success == false) {
            console.log(resData);
            throw new Error(`api returned error ${resData.error}`);
        }

        return resData;
    };

    GetAccount = async (token) => {
        let apiData = await this.GET_APICall_Token("/api/v1/account", token);

        return apiData.account;
    };

    GetUsers = async (token) => {
        let apiData = await this.GET_APICall_Token(
            "/api/v1/account/users",
            token
        );

        return apiData.users;
    };

    GetUser = async (token) => {
        let apiData = await this.GET_APICall_Token(
            "/api/v1/account/users/me",
            token
        );

        return apiData.user;
    };

    GetAgents = async (token) => {
        let apiData = await this.GET_APICall_Token(
            "/api/v1/account/agents",
            token
        );

        return apiData.agents;
    };

    GetAgentById = async (token, agentId) => {
        let apiData = await this.GET_APICall_Token(
            `/api/v1/account/agents/${agentId}`,
            token
        );

        return apiData.agent;
    };

    CreateAgentTask = async (token, agentId, taskData) => {
        await this.POST_APICall_Token(
            `/api/v1/account/agents/${agentId}/tasks`,
            token,
            taskData
        );
    };

    UpdateAgentConfig = async (token, updatedAgent) => {
        await this.PUT_APICall_Token(
            `/api/v1/account/agents/${updatedAgent._id}/configs`,
            token,
            { updatedAgent }
        );
    };

    DeleteAgent = async (token, agentId) => {
        await this.DELETE_APICall_Token(
            `/api/v1/account/agents/${agentId}`,
            token
        );
    };

    GetMods = async () => {
        const apiData = await this.GET_APICall_NoToken(`/api/v1/mods`);
        return apiData.mods;
    };

    InstallAgentMod = async (token, agentId, modReference) => {
        await this.POST_APICall_Token(
            `/api/v1/account/agents/${agentId}/mods/install`,
            token,
            { modReference }
        );
    };

    UninstallAgentMod = async (token, agentId, modReference) => {
        await this.POST_APICall_Token(
            `/api/v1/account/agents/${agentId}/mods/uninstall`,
            token,
            { modReference }
        );
    };

    GetAgentLogs = async (token, agentId) => {
        let apiData = await this.GET_APICall_Token(
            `/api/v1/account/agents/${agentId}/logs`,
            token
        );

        return apiData.logs;
    };

    GetAccountAudit = async (token, type) => {
        let apiData = await this.GET_APICall_Token(
            `/api/v1/account/audit?type=${type}`,
            token
        );

        return apiData.audit;
    };

    PostCreateAccountUser = async (token, email) => {
        let apiData = await this.POST_APICall_Token(
            `/api/v1/account/users`,
            token,
            { email }
        );

        return apiData;
    };

    GetUserByInviteCode = async (inviteCode) => {
        let apiData = await this.GET_APICall_NoToken(
            `/api/v1/account/users/byinvitecode/${inviteCode}`
        );

        return apiData.user;
    };

    PostAcceptInviteCode = async (invitecode, password) => {
        await this.POST_APICall_NoToken(
            `/api/v1/account/users/acceptinvite/${invitecode}`,
            { password }
        );
    };

    GetAgentMapData = async (agentId) => {
        let apiData = await this.GET_APICall_NoToken(
            `/api/v1/account/agents/${agentId}/mapdata`
        );

        return apiData.data;
    };
}

const backendAPI = new BackendAPI();
module.exports = backendAPI;
