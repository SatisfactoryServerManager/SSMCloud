const EventEmitter = require("events");
const fs = require("fs-extra");
const path = require("path");
const es = require("event-stream");
const GamePlayerModel = require("../models/game_player");
const AgentModel = require("../models/agent");
const AccountModel = require("../models/account");

const NotificationSystem = require("./server_notification_system");

class GamePlayerHandler extends EventEmitter {
    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.on("login_request", (AgentId, PlayerName, EOS) => {
            this.RecievedLoginRequest(AgentId, PlayerName, EOS);
        });

        this.on("join_succeed", (AgentId, PlayerName) => {
            this.RecievedJoinSucceed(AgentId, PlayerName);
        });

        this.on("actual_join", (AgentId, EOS) => {
            this.RecievedActualJoin(AgentId, EOS);
        });
    }

    ReadLogForPlayerEvents = async (AgentId, LogFile) => {
        if (!fs.existsSync(LogFile)) {
            return;
        }

        await new Promise((resolve, reject) => {
            var s = fs
                .createReadStream(LogFile)
                .pipe(es.split())
                .pipe(
                    es
                        .mapSync(async (line) => {
                            if (line != "") {
                                // pause the readstream
                                s.pause();

                                if (line.includes("LogNet: Login request: ")) {
                                    let EOS = "";
                                    if (line.includes("EOS:")) {
                                        EOS = line.match(/\EOS:(.+)/i)[1];
                                        EOS = EOS.split(" ")[0];
                                        EOS = EOS.replace("(EOS)", "");
                                        EOS = EOS.replace(",", "");
                                    } else if (line.includes("STEAM:")) {
                                        EOS = line.match(/\STEAM:(.+)/i)[1];
                                        EOS = EOS.split(" ")[0];
                                        EOS = EOS.replace("(STEAM)", "");
                                        EOS = EOS.replace(",", "");
                                    }

                                    if (EOS != "") {
                                        let PlayerName =
                                            line.match(/\?Name=(.+)/i)[1];
                                        PlayerName = PlayerName.split(" ")[0];

                                        const logDate =
                                            this.GetDateFromLine(line);

                                        await this.RecievedLoginRequest(
                                            AgentId,
                                            PlayerName,
                                            EOS,
                                            logDate
                                        );
                                    }
                                }

                                if (line.includes("LogNet: Join suc")) {
                                    let PlayerName = line.match(/\ed:(.+)/i)[1];
                                    PlayerName = PlayerName.replace(" ", "");

                                    const logDate = this.GetDateFromLine(line);
                                    await this.RecievedJoinSucceed(
                                        AgentId,
                                        PlayerName,
                                        logDate
                                    );
                                }

                                if (
                                    line.includes(
                                        "UNetConnection::Close: [UNetConnection]"
                                    )
                                ) {
                                    let EOS = "";
                                    if (line.includes("EOS:")) {
                                        EOS = line.match(/\EOS:(.+)/i)[1];
                                        EOS = EOS.split(" ")[0];
                                        EOS = EOS.replace("(EOS)", "");
                                        EOS = EOS.replace(",", "");
                                    } else if (line.includes("STEAM:")) {
                                        EOS = line.match(/\STEAM:(.+)/i)[1];
                                        EOS = EOS.split(" ")[0];
                                        EOS = EOS.replace("(STEAM)", "");
                                        EOS = EOS.replace(",", "");
                                    }

                                    if (EOS != "") {
                                        const logDate =
                                            this.GetDateFromLine(line);

                                        await this.RecievedClosed(
                                            AgentId,
                                            EOS,
                                            logDate
                                        );
                                    }
                                }

                                // resume the readstream, possibly from a callback
                                s.resume();
                            }
                        })
                        .on("error", (err) => {
                            reject(err);
                        })
                        .on("end", () => {
                            resolve();
                        })
                );
        });
    };

    GetDateFromLine(line) {
        let lineDate = line.match(/\[(.+?)\]/i)[1];
        const lineDateDataYMD = lineDate.split("-")[0].split(".");
        const lineDateDataTime = lineDate.split("-")[1].split(".");
        const d = new Date();
        d.setYear(lineDateDataYMD[0]);
        d.setMonth(lineDateDataYMD[1] - 1);
        d.setDate(lineDateDataYMD[2]);

        d.setHours(lineDateDataTime[0]);
        d.setMinutes(lineDateDataTime[1]);
        d.setSeconds(lineDateDataTime[2].split(":")[0]);
        d.setMilliseconds(lineDateDataTime[2].split(":")[1]);
        return d;
    }

    RecievedLoginRequest = async (AgentId, PlayerName, EOS, logDate) => {
        //console.log("login_request", AgentId, PlayerName, EOS);

        const existingPlayer = await GamePlayerModel.findOne({
            playerName: PlayerName,
            UUID: EOS,
        });

        if (existingPlayer == null) {
            await GamePlayerModel.create({
                playerName: PlayerName,
                UUID: EOS,
                state: "login_request",
                logDate,
            });
        } else {
            if (existingPlayer.logDate.getTime() > logDate.getTime()) return;

            existingPlayer.state = "login_request";
            existingPlayer.logDate = logDate;
            await existingPlayer.save();
        }
    };

    RecievedJoinSucceed = async (AgentId, PlayerName, logDate) => {
        const existingPlayer = await GamePlayerModel.findOne({
            playerName: PlayerName,
            state: "login_request",
        });

        if (existingPlayer != null) {
            if (existingPlayer.logDate.getTime() > logDate.getTime()) return;

            //console.log("join_succeed", AgentId, PlayerName);
            existingPlayer.state = "online";
            existingPlayer.logDate = logDate;
            await existingPlayer.save();

            const theAgent = await AgentModel.findOne({ _id: AgentId });

            if (theAgent) {
                const theAccount = await AccountModel.findOne({
                    agents: theAgent._id,
                });

                await NotificationSystem.CreateNotification(
                    "agent.sf.playerjoined",
                    {
                        agent_name: theAgent.agentName,
                        player_name: existingPlayer.playerName,
                    },
                    theAccount._id
                );

                await theAgent.populate("players");
                const existingAgentPlayer = theAgent.players.find(
                    (p) => p._id.toString() == existingPlayer._id.toString()
                );

                if (existingAgentPlayer == null) {
                    theAgent.players.push(existingPlayer);
                    await theAgent.save();
                }
            }
        }
    };

    RecievedClosed = async (AgentId, EOS, logDate) => {
        const existingPlayer = await GamePlayerModel.findOne({
            UUID: EOS,
            state: "online",
        });

        if (existingPlayer != null) {
            if (existingPlayer.logDate.getTime() > logDate.getTime()) return;

            console.log("close", AgentId, EOS);
            existingPlayer.state = "offline";
            existingPlayer.logDate = logDate;

            await existingPlayer.save();

            const theAgent = await AgentModel.findOne({ _id: AgentId });
            if (theAgent) {
                const theAccount = await AccountModel.findOne({
                    agents: theAgent._id,
                });

                await NotificationSystem.CreateNotification(
                    "agent.sf.playerleave",
                    {
                        agent_name: theAgent.agentName,
                        player_name: existingPlayer.playerName,
                    },
                    theAccount._id
                );
            }
        }
    };
}

const gamePlayerHandler = new GamePlayerHandler();
module.exports = gamePlayerHandler;
