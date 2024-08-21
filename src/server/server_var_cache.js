import Mrhid6Utils from "mrhid6utils";
const iVarCache = Mrhid6Utils.VarCache;

import path from "path"
import fs from "fs-extra"

import os from "os"

const osHomeDir = os.homedir();

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
export default varCache;
