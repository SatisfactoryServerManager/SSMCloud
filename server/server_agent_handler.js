const Agent = require("../models/agent");
const MessageQueueItem = require("../models/messagequeueitem");

const Logger = require("./server_logger");

class AgentHandler {
    init() {
        this.CheckAllAgentsLastOnline();
        this.PurgeMessageQueues();
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

    PurgeMessageQueues = async () => {
        setInterval(async () => {
            Logger.info("[AgentHandler] - Purging Message Queue");

            const agents = await Agent.find().select("+messageQueue");

            for (let i = 0; i < agents.length; i++) {
                const agent = agents[i];
                await agent.populate("messageQueue");

                for (let j = 0; j < agent.messageQueue.length; j++) {
                    const message = agent.messageQueue[j];

                    if (message.completed || message.retries == 10) {
                        await MessageQueueItem.deleteOne({ _id: message._id });
                        agent.messageQueue.splice(j, 1);
                        await agent.save();
                        break;
                    }
                }
            }
            Logger.info("[AgentHandler] - Completed Purging Message Queue");
        }, 30000);
    };
}

const agentHandler = new AgentHandler();
module.exports = agentHandler;
