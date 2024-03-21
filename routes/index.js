const express = require("express");
const router = express.Router();

const BackendAPI = require("../utils/backend-api");

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

    try {
        const mapData = await BackendAPI.GetAgentMapData(req.params.agentId);
        resData.success = true;
        resData.players = mapData.players;
        resData.buildings = mapData.buildings;
    } catch (err) {
        resData.error = err.message;
    }

    res.json(resData);
});

router.use(require("./auth"));

router.use("/dashboard", require("./dashboard"));

module.exports = router;
