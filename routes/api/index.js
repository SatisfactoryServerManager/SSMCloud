const express = require("express");

const router = express.Router();

router.use("/agent", require("./agent"));
router.use("/public", require("./public"));

module.exports = router;
