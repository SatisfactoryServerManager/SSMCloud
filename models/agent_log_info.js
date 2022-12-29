const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const AgentLogInfoSchema = new Schema(
    {
        FactoryGame: {
            type: String,
            default: "",
        },
        FactoryGameData: {
            type: [
                {
                    type: String,
                },
            ],
            default: [],
        },
        SSMAgent: {
            type: String,
            default: "",
        },
        SSMAgentData: {
            type: [
                {
                    type: String,
                },
            ],
            default: [],
        },
        SSMSteamCMD: {
            type: String,
            default: "",
        },
        SSMSteamCMDData: {
            type: [
                {
                    type: String,
                },
            ],
            default: [],
        },
    },
    { minimize: false }
);

module.exports = mongoose.model("AgentLogInfo", AgentLogInfoSchema);
