const Agent = require("../models/agent");
const MessageQueueItem = require("../models/messagequeueitem");
const Account = require("../models/account");
const AgentBackupModel = require("../models/agent_backup");

const fs = require("fs-extra");

const Logger = require("./server_logger");

const { Octokit } = require("@octokit/rest");
const semver = require("semver");

class AgentHandler {
    init() {
        this.CheckAllAgentsLastOnline();
        this.PurgeMessageQueues();
        this.GetMostRecentGHAgentVersion();

        this.SetupTimers();
    }

    SetupTimers() {
        setInterval(async () => {
            await this.GetMostRecentGHAgentVersion();
        }, 4 * 60 * 60 * 1000);

        setInterval(async () => {
            await this.CheckAllAgentsLastOnline();
            await this.PurgeMessageQueues();
            await this.CheckAllAgentsNeedUpdate();
            await this.CleanupAgentBackups();
        }, 30000);
    }

    CheckAllAgentsLastOnline = async () => {
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
    };

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

    CleanupAgentBackups = async () => {
        const Agents = await Agent.find();

        for (let i = 0; i < Agents.length; i++) {
            const Agent = Agents[i];

            if (Agent.config == null || Agent.config.version == null) {
                continue;
            }

            if (Agent.config.backup == null) {
                continue;
            }

            await Agent.populate("backups");

            if (Agent.backups.length <= Agent.config.backup.keep) {
                continue;
            }

            const count = Agent.backups.length - Agent.config.backup.keep;

            for (let j = 0; j < count; j++) {
                const AgentBackup = Agent.backups[j];

                if (fs.existsSync(AgentBackup.fileName)) {
                    fs.unlinkSync(AgentBackup.fileName);
                    Logger.debug(
                        `Removing Agent Backup: ${AgentBackup.fileName}`
                    );
                }

                await AgentBackupModel.deleteOne({ _id: AgentBackup._id });
                Agent.backups.pull({ _id: AgentBackup._id });
            }

            await Agent.save();
        }
    };

    PurgeMessageQueues = async () => {
        Logger.info("[AgentHandler] - Purging Message Queue");

        const agents = await Agent.find().select("+messageQueue");

        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];
            await agent.populate("messageQueue");

            for (let j = 0; j < agent.messageQueue.length; j++) {
                const message = agent.messageQueue[j];

                let dayDiff = 10;
                if (message.created != null) {
                    var t2 = new Date().getTime();
                    var t1 = message.created.getTime();

                    dayDiff = Math.floor((t2 - t1) / (24 * 3600 * 1000));
                }

                if (message.completed || message.retries == 10 || dayDiff > 5) {
                    await MessageQueueItem.deleteOne({ _id: message._id });
                    agent.messageQueue.splice(j, 1);
                    await agent.save();
                    break;
                }
            }
        }

        var cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 5);

        const staleItems = await MessageQueueItem.find({
            $or: [
                { completed: true },
                { retries: 10 },
                { created: { $lt: cutoff } },
            ],
        });

        for (let i = 0; i < staleItems.length; i++) {
            const message = staleItems[i];
            await MessageQueueItem.deleteOne({ _id: message._id });
        }

        Logger.info("[AgentHandler] - Completed Purging Message Queue");
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
            this._LatestAgentRelease = "0.0.0";
            //console.log(err);
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
                const theAccount = await Account.findOne({ agents: agent });
                if (theAccount) {
                    await theAccount.CreateEvent(
                        "AGENT",
                        `Agent (${agent.agentName}) requires updating. Current Version: ${agentVersion}, Latest Version: ${this._LatestAgentRelease}`,
                        5
                    );
                }
                await agent.save();
            }
        }
    };
}

const agentHandler = new AgentHandler();
module.exports = agentHandler;
