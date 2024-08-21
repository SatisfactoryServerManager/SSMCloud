import express from "express";

import BackendAPI from "../utils/backend-api.js";

import authRoutes from "./auth.js";
import dashboardRoutes from "./dashboard/index.js";

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

router.use(authRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
