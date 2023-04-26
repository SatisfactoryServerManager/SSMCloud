const express = require("express");

const router = express.Router();

router.get("/ping", (req, res) => {
    res.status(200).json({
        success: true,
    });
});

router.use("/agent", require("./agent"));
router.use("/v1", require("./v1"));

module.exports = router;
