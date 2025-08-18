import path from "path";
import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import { doubleCsrf } from "csrf-csrf";

import ejs from "ejs";

global.__basedir = path.resolve(path.resolve());

if (__basedir == null) {
    global.__basedir = path.dirname(process.argv[1]);
}

const {
    doubleCsrfProtection, // This is the default CSRF protection middleware.
} = doubleCsrf({
    getSecret: () => "Secret",
    cookieName: "x-csrf-test", // Prefer "__Host-" prefixed names if possible
    cookieOptions: { sameSite: false, secure: false },
    size: 64, // The size of the generated tokens in bits
    getTokenFromRequest: (req) => {
        if (req.headers["x-csrf-token"] != null) {
            return req.headers["x-csrf-token"];
        } else {
            return req.body["_csrf"];
        }
    },
    getSessionIdentifier: (req) => req.session.id,
});

import flash from "connect-flash";
import helmet from "helmet";
import compression from "compression";
import favicon from "serve-favicon";
import cors from "cors";
import methodOverride from "method-override";
import fs from "fs-extra";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import sessionFileStore from "session-file-store";

var FileStore = sessionFileStore(session);

import frameguard from "frameguard";

/* SSM Server Utils */
import VarCache from "./server/server_var_cache.js";
import Config from "./server/server_config.js";
import Logger from "./server/server_logger.js";
import ServerApp from "./server/server_app.js";

/* End SSM Server Utils */

/* Controllers */
import { get404, get500 } from "./server/controllers/error.js";

import multer from "multer";
const forms = multer();

import appRoutes from "./server/routes/index.js";

process.on("uncaughtException", function (err) {
    console.log(err);
    try {
        fs.writeFileSync("log.txt", err.message);
    } catch (fserr) {
        console.log(fserr);
    }
    process.exit(1);
});

class SSMCloud_App {
    constructor() {
        this.init();
    }

    init = async () => {
        VarCache.init();
        Config.init();
        Logger.init();
        Logger.info("[APP] [PREINIT] - Loading Configs..");
        await Config.load();
        Logger.info(
            `[APP] [PREINIT] - Loaded Config: ${Config._options.configFilePath}`
        );

        Logger.info(`[APP] [PREINIT] - Version: v${Config.get("ssm.version")}`);
        Logger.info("[APP] [PREINIT] - Starting SSM..");
        this.startExpress();
    };

    startExpress() {
        const app = express();

        app.use(express.json());

        app.use(
            express.urlencoded({
                extended: true,
            })
        );

        app.set("trust proxy", true);

        Logger.info("[APP] [EXPRESS] - Starting Express..");
        app.set("view engine", "ejs");
        app.engine("ejs", ejs.__express);
        app.set("views", path.join(__basedir, "src", "server", "views"));

        var corsOptions = {
            origin: "*",
            credentials: true,
            optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
        };
        app.use(cors(corsOptions));

        app.use(function (req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header(
                "Access-Control-Allow-Headers",
                "Origin, X-Requested-With, Content-Type, Accept"
            );
            res.header(
                "Content-Security-Policy",
                "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://js.hcaptcha.com"
            );
            next();
        });

        // methodOverride
        app.use(methodOverride("_method"));

        app.use(
            helmet({
                crossOriginEmbedderPolicy: false,
                contentSecurityPolicy: false,
            })
        );

        app.use(frameguard());
        app.use(compression());

        const modulesPath = path.resolve(path.join(__basedir, "node_modules"));

        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(
            "/public",
            express.static(path.join(__basedir, "src", "client", "public"))
        );
        app.use(
            "/libraries/bootstrap",
            express.static(modulesPath + "/bootstrap")
        );
        app.use("/libraries/jquery", express.static(modulesPath + "/jquery"));
        app.use(
            "/libraries/@fortawesome",
            express.static(modulesPath + "/@fortawesome")
        );
        app.use(
            "/libraries/bootstrap4-toggle",
            express.static(modulesPath + "/bootstrap4-toggle")
        );
        app.use("/libraries/toastr", express.static(modulesPath + "/toastr"));
        app.use(
            "/libraries/jquery-steps",
            express.static(modulesPath + "/jquery-steps/build")
        );

        app.use(
            "/libraries/chart.js",
            express.static(modulesPath + "/chart.js")
        );

        app.use(morgan("combined"));

        app.use(
            session({
                secret: "SSMCloud",
                resave: false,
                saveUninitialized: false,
                rolling: true,
                unset: "destroy",
                store: new FileStore({
                    path: path.join(Config.get("ssm.tempdir"), "sessions"),
                }),
                cookie: {
                    maxAge: 24 * 60 * 60 * 1000,
                    httpOnly: false,
                },
            })
        );

        app.use(cookieParser());
        app.use(multer().single("file"));
        app.use(doubleCsrfProtection);

        // Make the token available to all views
        app.use(function (req, res, next) {
            res.locals.csrfToken = req.csrfToken();
            next();
        });
        app.use(flash());

        // if (!isSea()) {
        //     app.use(
        //         favicon(
        //             path.join(
        //                 __basedir,
        //                 "client",
        //                 "public",
        //                 "images",
        //                 "favicons",
        //                 "favicon.ico"
        //             )
        //         )
        //     );
        // } else {
        //     app.use(favicon(getAsset("favicon.ico")));
        // }

        app.use((req, res, next) => {
            res.locals.isAuthenticated = req.session.isLoggedIn;
            next();
        });
        app.use("/docs", express.static(__basedir + "/docs"));

        app.use(appRoutes);

        app.get("/500", get500);

        app.use(get404);

        // Error-handling middleware. Express executes this middleware when you call next() with an error passed to it
        app.use((error, req, res, next) => {
            console.log(error);
            res.status(500).render("500", {
                pageTitle: "Server Error",
                path: "/500",
                isAuthenticated: req.session.isLoggedIn,
                errorMessage: error.message,
            });
        });

        Logger.info(
            `[APP] - Listening on port: ${Config.get("ssm.http_port")}`
        );
        app.listen(Config.get("ssm.http_port"));
        ServerApp.init();
    }
}

new SSMCloud_App();
