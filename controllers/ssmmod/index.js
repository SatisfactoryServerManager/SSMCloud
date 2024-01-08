const Agent = require("../../models/agent");
const GamePlayer = require("../../models/game_player");

exports.postPlayers = async (req, res, next) => {
    try {
        const AgentAPIKey = req.agentKey;

        const theAgent = await Agent.findOne({ apiKey: AgentAPIKey });
        await theAgent.populate("players");

        const postData = req.body;

        for (let i = 0; i < postData.players.length; i++) {
            const player = postData.players[i];

            const existingPlayer = await GamePlayer.findOne({
                playerName: player.name,
            });

            if (player.location == null) {
                player.location = {
                    x: 0,
                    y: 0,
                    z: 0,
                };
            }

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

            for (let j = 0; j < theAgent.players.length; j++) {
                const agentPlayer = theAgent.players[j];
                agentPlayer.online = false;

                if (agentPlayer._id.equals(existingPlayer._id)) {
                    agentPlayer.online = true;
                    agentPlayer.lastOnlineDate = new Date();
                    agentPlayer.location = {
                        x: player.location.x || 0,
                        y: player.location.y || 0,
                        z: player.location.z || 0,
                    };
                }

                await agentPlayer.save();
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
