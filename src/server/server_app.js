import AgentHandler from "./server_agent_handler.js";
import EmailHandler from "./server_email_handler.js";
import BackendAPI from "./utils/backend-api.js";

class ServerApp {
    init = async () => {
        BackendAPI.init();
        AgentHandler.init();
        EmailHandler.init();
    };
}

const serverApp = new ServerApp();
export default serverApp;
