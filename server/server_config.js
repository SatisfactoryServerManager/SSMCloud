const fs = require("fs-extra");
const path = require("path");
const CryptoJS = require("crypto-js");

const semver = require("semver");

const mrhid6utils = require("mrhid6utils");
const iConfig = mrhid6utils.Config;
const platform = process.platform;

let userDataPath = null;

switch (platform) {
    case "win32":
        userDataPath = "C:\\ProgramData\\SSM_Cloud";
        break;
    case "linux":
        userDataPath = require("os").homedir() + "/.SSM_Cloud";
        break;
}

if (fs.pathExistsSync(userDataPath) == false) {
    fs.mkdirSync(userDataPath);
}

class ServerConfig extends iConfig {
    constructor() {
        super({
            configName: "SSM",
            createConfig: true,
            useExactPath: true,
            configBaseDirectory: path.join(userDataPath, "configs"),
        });
    }

    setDefaultValues = async () => {
        var pjson = require("../package.json");
        super.set("ssm.version", pjson.version);

        super.set("ssm.tempdir", path.join(userDataPath, "temp"));
        fs.ensureDirSync(super.get("ssm.tempdir"));

        super.set("ssm.uploadsdir", path.join(userDataPath, "uploads"));
        fs.ensureDirSync(super.get("ssm.uploadsdir"));

        super.get("ssm.http_port", 3000);

        // Mongo DB Config
        super.get("ssm.db.user", "ssm");
        super.get("ssm.db.pass", "#SSMP@$£");
        super.get("ssm.db.host", "localhost");
        super.get("ssm.db.database", "ssm");
    };
}

const serverConfig = new ServerConfig();

module.exports = serverConfig;
