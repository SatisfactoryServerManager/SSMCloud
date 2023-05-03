const fs = require("fs-extra");
const path = require("path");
const CryptoJS = require("crypto-js");

const semver = require("semver");

const mrhid6utils = require("mrhid6utils");
const iConfig = mrhid6utils.Config;

const VarCache = require("./server_var_cache");

class ServerConfig extends iConfig {
    init() {
        super.init({
            configName: "SSM",
            createConfig: true,
            useExactPath: true,
            configBaseDirectory: path.join(VarCache.get("homedir"), "configs"),
        });
    }

    setDefaultValues = async () => {
        var pjson = require("../package.json");
        super.set("ssm.version", pjson.version);

        super.set("ssm.tempdir", path.join(VarCache.get("homedir"), "temp"));
        fs.ensureDirSync(super.get("ssm.tempdir"));

        super.set(
            "ssm.uploadsdir",
            path.join(VarCache.get("homedir"), "uploads")
        );
        fs.ensureDirSync(super.get("ssm.uploadsdir"));

        super.get("ssm.http_port", 3000);

        // Mongo DB Config
        super.get("ssm.db.user", "ssm");
        super.get("ssm.db.pass", "#SSMPa$£");
        super.get("ssm.db.host", "127.0.0.1");
        super.get("ssm.db.database", "ssm");
        super.get("ssm.hcaptcha.enabled", false);
        super.get("ssm.hcaptcha.sitekey", "");
        super.get("ssm.hcaptcha.secret", "");
    };
}

const serverConfig = new ServerConfig();

module.exports = serverConfig;
