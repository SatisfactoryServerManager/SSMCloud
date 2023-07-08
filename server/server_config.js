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
        super.get("ssm.db.user", process.env.MONGODB_USER || "ssm");
        super.get("ssm.db.pass", process.end.MONGODB_PASS || "#SSMPa$£");
        super.get("ssm.db.host", process.env.MONGODB_SERVER || "127.0.0.1");
        super.get("ssm.db.database", process.env.MONGODB_DB || "ssm");

        // hCaptcha Config
        super.get("ssm.hcaptcha.enabled", false);
        super.get("ssm.hcaptcha.sitekey", "");
        super.get("ssm.hcaptcha.secret", "");

        //Mail Config
        super.get("ssm.mail.enabled", false);
        super.get("ssm.mail.sender", "SSM <ssm@example.com>");
        super.get("ssm.mail.transport.host", "mail.example.com");
        super.get("ssm.mail.transport.port", 25);
        super.get("ssm.mail.transport.secure", false);
        super.get("ssm.mail.transport.tls.servername", "mail.exmaple.com");
        super.get("ssm.mail.transport.tls.ciphers", "SSLv3");
        super.get("ssm.mail.transport.ignoreTLS", true);
        super.get("ssm.mail.transport.auth.user", "EMAIL");
        super.get("ssm.mail.transport.auth.pass", "PASSWORD");

        // Mods

        super.get("ssm.mods.usedev", true);
        super.get("ssm.mods.useexp", false);
        if (super.get("ssm.mods.usedev")) {
            if (super.get("ssm.mods.useexp")) {
                super.set(
                    "ssm.mods.api",
                    "https://ficsit-api.mircearoata.duckdns.org"
                );
            } else {
                super.set("ssm.mods.api", "https://api.ficsit.dev");
            }
        } else {
            super.set("ssm.mods.api", "https://api.ficsit.app");
        }
    };
}

const serverConfig = new ServerConfig();

module.exports = serverConfig;
