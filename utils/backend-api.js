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

        const resData = await res.json();

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

        const resData = await res.json();

        if (resData.success == false) {
            console.log(resData);
            throw new Error(`api returned error ${resData.error}`);
        }

        return resData;
    };

    POST_APICall_NoToken = async (endpoint, body = {}) => {
        return await this.POST_APICall_Token(endpoint, "", body);
    };
}

const backendAPI = new BackendAPI();
module.exports = backendAPI;
