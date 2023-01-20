const Mrhid6Utils = require("mrhid6utils");
const iVarCache = Mrhid6Utils.VarCache;

const path = require("path");
const fs = require("fs-extra");

const osHomeDir = require("os").homedir();

class ServerVarCache extends iVarCache {
    init() {
        super.init();

        fs.ensureDirSync(super.get("homedir"));
        console.log(this._data);
    }

    setupWindowsVarCache() {
        super.get("homedir", "C:\\ProgramData\\SSM_Cloud");
    }

    setupLinuxVarCache() {
        super.get("homedir", path.join(osHomeDir, "SSM_Cloud"));
    }
}

const varCache = new ServerVarCache();
module.exports = varCache;
