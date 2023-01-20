const iLogger = require("mrhid6utils").Logger;
const path = require("path");
const VarCache = require("./server_var_cache");

class Logger extends iLogger {
    init() {
        super.init({
            logBaseDirectory: path.join(VarCache.get("homedir"), "logs"),
            logName: "SSM",
        });
    }
}

const logger = new Logger();
module.exports = logger;
