const AgentHandler = require("./server_agent_handler");
const EmailHandler = require("./server_email_handler");

const BackendAPI = require("../utils/backend-api");

class ServerApp {
    init = async () => {
        BackendAPI.init();
        AgentHandler.init();
        EmailHandler.init();
    };
}

const serverApp = new ServerApp();
module.exports = serverApp;
