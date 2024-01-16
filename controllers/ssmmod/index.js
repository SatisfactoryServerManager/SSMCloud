const Agent = require("../../models/agent");
const GamePlayer = require("../../models/game_player");

exports.postPlayers = async (req, res, next) => {
    try {
        const AgentAPIKey = req.agentKey;

        const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });
        await theAgent.populate("players");

        const postData = req.body;

        // Loop through all agent players and mark offline
        for (let j = 0; j < theAgent.players.length; j++) {
            const agentPlayer = theAgent.players[j];
            agentPlayer.online = false;

            await agentPlayer.save();
        }

        // Loop through all online players sent from ssm mod and update
        for (let i = 0; i < postData.players.length; i++) {
            const player = postData.players[i];

            if (player.location == null) {
                player.location = {
                    x: 0,
                    y: 0,
                    z: 0,
                };
            }

            const existingPlayer = await GamePlayer.findOne({
                playerName: player.name,
            });

            if (existingPlayer == null) {
                const newPlayer = await GamePlayer.create({
                    playerName: player.name,
                    UUID: player.id,
                    online: true,
                    location: {
                        x: player.location.x || 0,
                        y: player.location.y || 0,
                        z: player.location.z || 0,
                    },
                });

                theAgent.players.push(newPlayer);
                continue;
            }
            let FoundPlayer = false;
            for (let j = 0; j < theAgent.players.length; j++) {
                const agentPlayer = theAgent.players[j];

                if (agentPlayer.playerName == existingPlayer.playerName) {
                    agentPlayer.online = true;
                    agentPlayer.lastOnlineDate = new Date();
                    agentPlayer.location = {
                        x: player.location.x || 0,
                        y: player.location.y || 0,
                        z: player.location.z || 0,
                    };
                    await agentPlayer.save();

                    FoundPlayer = true;
                }
            }

            // If the player wasn't associated with the agent then do that
            if (!FoundPlayer) {
                theAgent.players.push(existingPlayer);
            }
        }

        await theAgent.save();

        res.json({
            success: true,
        });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
};

exports.postBuildings = async (req, res, next) => {
    res.json({
        success: true,
    });
};
