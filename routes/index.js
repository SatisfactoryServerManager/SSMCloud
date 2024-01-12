const path = require("path");

const express = require("express");
const AgentModel = require("../models/agent");

var ObjectId = require("mongoose").Types.ObjectId;

const router = express.Router();

router.get("/", (req, res, next) => {
    res.render("home.ejs", {
        isLoggedIn: req.session != null ? req.session.isLoggedIn : false,
    });
});

router.get("/map/:agentId", async (req, res, next) => {
    res.render("map.ejs", {
        isLoggedIn: req.session != null ? req.session.isLoggedIn : false,
    });
});

router.get("/map/:agentId/data", async (req, res, next) => {
    const resData = {
        success: false,
        error: "",
        players: [],
        buildings: [],
    };

    const agentId = req.params.agentId;

    let theAgent = null;

    if (agentId.length == 8) {
        const agents = await AgentModel.find();

        theAgent = agents.find((a) => {
            const a_id = a._id.toString();
            return a_id.substring(a_id.length - 8) === agentId;
        });
    } else {
        if (!ObjectId.isValid(agentId)) {
            resData.success = false;
            resData.error = "Agent ID Is Invalid!";
            return res.json(resData);
        }

        theAgent = await AgentModel.findOne({
            _id: agentId,
        });
    }

    if (theAgent == null) {
        resData.success = false;
        resData.error = "Agent Is Null!";
        return res.json(resData);
    }

    await theAgent.populate("players");

    resData.success = true;
    resData.players = theAgent.players;

    res.json(resData);
});

router.use(require("./auth"));

router.use("/dashboard", require("./dashboard"));

module.exports = router;
