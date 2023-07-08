const Mrhid6Utils = require("mrhid6utils");
const iVarCache = Mrhid6Utils.VarCache;

const path = require("path");
const fs = require("fs-extra");

const osHomeDir = require("os").homedir();

class ServerVarCache extends iVarCache {
    init() {
        super.init();

        fs.ensureDirSync(super.get("homedir"));
    }

    setupWindowsVarCache() {
        super.get("homedir", "C:\\ProgramData\\SSM\\Cloud\\data");
    }

    setupLinuxVarCache() {
        super.get("homedir", "/SSM/Cloud/data");
    }
}

const varCache = new ServerVarCache();
module.exports = varCache;
