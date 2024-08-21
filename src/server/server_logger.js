import mrhid6utils from "mrhid6utils";
import path from "path";
import VarCache from "./server_var_cache.js";

const iLogger = mrhid6utils.Logger;

class Logger extends iLogger {
    init() {
        super.init({
            logBaseDirectory: path.join(VarCache.get("homedir"), "logs"),
            logName: "SSM",
        });
    }
}

const logger = new Logger();
export default logger;
