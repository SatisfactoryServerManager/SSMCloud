const Agent = require("../models/agent");

const Logger = require("./server_logger");

class AgentHandler {
    init() {
        this.CheckAllAgentsLastOnline();
    }

    CheckAllAgentsLastOnline() {
        setInterval(async () => {
            Logger.info(
                "[AgentHandler] - Checking All Agents Last Communication Dates"
            );
            const agents = await Agent.find();

            for (let i = 0; i < agents.length; i++) {
                const agent = agents[i];
                await this.checkAgentLastOnline(agent);
            }
            Logger.info(
                "[AgentHandler] - Checked All Agents Last Communication Dates"
            );
        }, 30000);
    }

    checkAgentLastOnline = async (agent) => {
        const lastCommDate = new Date(agent.lastCommDate);
        const dateNow = Date.now();

        const diffTime = Math.abs(dateNow - lastCommDate);
        const diffMins = Math.ceil(diffTime / (1000 * 60));

        if (diffMins > 10) {
            if (agent.online) {
                agent.online = false;
                await agent.save();
            }
        }
    };
}

const agentHandler = new AgentHandler();
module.exports = agentHandler;
