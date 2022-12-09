const iLogger = require("mrhid6utils").Logger;
const path = require("path");
const platform = process.platform;

switch (platform) {
    case "win32":
        userDataPath = path.resolve("C:\\ProgramData\\SSM_Cloud");
        break;
    case "linux":
        userDataPath = path.resolve(
            path.join(require("os").homedir(), ".SSM_Cloud")
        );
        break;
}

class Logger extends iLogger {
    constructor() {
        super({
            logBaseDirectory: path.join(userDataPath, "logs"),
            logName: "SSM",
        });
    }
}

const logger = new Logger();
module.exports = logger;
