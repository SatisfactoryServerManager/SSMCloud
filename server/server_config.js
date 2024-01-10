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

        super.get("ssm.http_port", parseInt(process.env.HTTP_PORT || 3000));

        this.GetConfigDefaultValue("ssm.http_port", 3000, true);

        // Mongo DB Config
        this.GetConfigDefaultValue("ssm.db.user", "ssm");
        this.GetConfigDefaultValue("ssm.db.pass", "#SSMP@$£");
        this.GetConfigDefaultValue("ssm.db.database", "ssm");
        this.GetConfigDefaultValue("ssm.db.server", "127.0.0.1");
        this.GetConfigDefaultValue("ssm.db.port", 27017, true);

        // hCaptcha Config
        this.GetConfigDefaultValue("ssm.hcaptcha.enabled", false, false, true);
        this.GetConfigDefaultValue("ssm.hcaptcha.sitekey", "");
        this.GetConfigDefaultValue("ssm.hcaptcha.secret", "");

        //Mail Config
        this.GetConfigDefaultValue("ssm.mail.enabled", false, false, true);
        this.GetConfigDefaultValue("ssm.mail.sender", "SSM <ssm@example.com>");
        this.GetConfigDefaultValue(
            "ssm.mail.transport.host",
            "mail.example.com"
        );
        this.GetConfigDefaultValue("ssm.mail.transport.port", 25, true);
        this.GetConfigDefaultValue(
            "ssm.mail.transport.secure",
            false,
            false,
            true
        );
        this.GetConfigDefaultValue(
            "ssm.mail.transport.tls.servername",
            "mail.example.com"
        );
        this.GetConfigDefaultValue("ssm.mail.transport.tls.ciphers", "SSLv3");
        this.GetConfigDefaultValue(
            "ssm.mail.transport.ignoreTLS",
            true,
            false,
            true
        );
        this.GetConfigDefaultValue("ssm.mail.transport.auth.user", "EMAIL");
        this.GetConfigDefaultValue("ssm.mail.transport.auth.pass", "PASSWORD");

        // Mods

        this.GetConfigDefaultValue("ssm.mods.usedev", false, false, true);

        if (super.get("ssm.mods.usedev")) {
            super.set("ssm.mods.api", "https://api.ficsit.dev");
        } else {
            super.set("ssm.mods.api", "https://api.ficsit.app");
        }

        // Flags

        this.GetConfigDefaultValue(
            "ssm.flags.deleteinactiveaccounts",
            true,
            false,
            true
        );
    };

    GetConfigDefaultValue(key, defaultVal, isInt = false, isBool = false) {
        const envKey = key.replaceAll(".", "_").toUpperCase();
        const envVar = process.env[envKey];

        if (envVar != null) {
            defaultVal = envVar;
        } else {
            console.log(
                `Couldn't find environment variable ${envKey} using default value of ${defaultVal}`
            );
        }

        if (isInt && typeof defaultVal != "number") {
            defaultVal = parseInt(defaultVal);
        }

        if (isBool && typeof defaultVal != "boolean") {
            defaultVal = defaultVal === "true" || defaultVal === 1;
        }

        if (envVar != null) {
            if (envVar != super.get(key)) {
                super.set(key, defaultVal);
            }
        }

        return super.get(key, defaultVal);
    }
}

const serverConfig = new ServerConfig();

module.exports = serverConfig;
