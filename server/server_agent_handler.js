const Agent = require("../models/agent");
const MessageQueueItem = require("../models/messagequeueitem");

const Logger = require("./server_logger");

const { Octokit } = require("@octokit/rest");
const semver = require("semver");

class AgentHandler {
    init() {
        this.CheckAllAgentsLastOnline();
        this.PurgeMessageQueues();
        this.GetMostRecentGHAgentVersion();
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

            await this.CheckAllAgentsNeedUpdate();
            Logger.info("[AgentHandler] - Completed Purging Message Queue");
        }, 30000);

        setInterval(async () => {
            await this.GetMostRecentGHAgentVersion();
        }, 30 * 60 * 1000);
    };

    GetMostRecentGHAgentVersion = async () => {
        try {
            const octokit = new Octokit();

            const releases = await octokit.repos.listReleases({
                owner: "SatisfactoryServerManager",
                repo: "SSMAgent",
            });

            const releaseData = releases.data;

            if (releaseData.length == 0) return;

            this._LatestAgentRelease = semver.clean(releaseData[0].tag_name);
        } catch (err) {
            console.log(err);
        }
    };

    CheckAllAgentsNeedUpdate = async () => {
        const agents = await Agent.find().select("+messageQueue");

        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];

            if (agent.config == null || agent.config.version == null) {
                continue;
            }

            const agentVersion = semver.clean(agent.config.version);
            const prevNeedUpdate = agent.needsUpdate;

            if (semver.lt(agentVersion, this._LatestAgentRelease)) {
                agent.needsUpdate = true;
            } else {
                agent.needsUpdate = false;
            }

            if (prevNeedUpdate != agent.needsUpdate) {
                await agent.save();
            }
        }
    };
}

const agentHandler = new AgentHandler();
module.exports = agentHandler;
