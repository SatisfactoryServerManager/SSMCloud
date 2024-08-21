import {Octokit} from "@octokit/rest"
import semver from "semver"

class AgentHandler {
    init() {
        this.GetMostRecentGHAgentVersion();
        this.SetupTimers();
    }

    SetupTimers() {
        setInterval(async () => {
            await this.GetMostRecentGHAgentVersion();
        }, 4 * 60 * 60 * 1000);
    }

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
}

const agentHandler = new AgentHandler();
export default agentHandler;
