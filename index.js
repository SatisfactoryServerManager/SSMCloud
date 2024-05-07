global.__basedir = __dirname;

const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const { doubleCsrf } = require("csrf-csrf");
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
            console.log(req.body);
            return req.body["_csrf"];
        }
    },
});

const flash = require("connect-flash");
const helmet = require("helmet");
const compression = require("compression");
const favicon = require("serve-favicon");
const cors = require("cors");
const methodOverride = require("method-override");
const fs = require("fs-extra");
const morgan = require("morgan");
var cookieParser = require("cookie-parser");

var FileStore = require("session-file-store")(session);

const frameguard = require("frameguard");

/* SSM Server Utils */
const VarCache = require("./server/server_var_cache");
const Config = require("./server/server_config");
const Logger = require("./server/server_logger");
const ServerApp = require("./server/server_app");

/* End SSM Server Utils */

/* Controllers */

const errorController = require("./controllers/error");
const multer = require("multer");
const forms = multer();

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
        // Setting this explicity even though the views folder in main directory is where the view engine looks for views by default
        app.set("views", "views");

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

        app.use(bodyParser.urlencoded({ extended: true }));
        app.use("/public", express.static(path.join(__dirname, "public")));
        app.use(
            "/libraries/bootstrap",
            express.static(__dirname + "/node_modules/bootstrap")
        );
        app.use(
            "/libraries/jquery",
            express.static(__dirname + "/node_modules/jquery")
        );
        app.use(
            "/libraries/@fortawesome",
            express.static(__dirname + "/node_modules/@fortawesome")
        );
        app.use(
            "/libraries/bootstrap4-toggle",
            express.static(__dirname + "/node_modules/bootstrap4-toggle")
        );
        app.use(
            "/libraries/toastr",
            express.static(__dirname + "/node_modules/toastr")
        );
        app.use(
            "/libraries/moment",
            express.static(__dirname + "/node_modules/moment")
        );
        app.use(
            "/libraries/datatables.net",
            express.static(__dirname + "/node_modules/datatables.net")
        );

        app.use(
            "/libraries/datatables.net-bs5",
            express.static(__dirname + "/node_modules/datatables.net-bs5")
        );

        app.use(
            "/libraries/jquery-circle-progress",
            express.static(__dirname + "/node_modules/jquery-circle-progress")
        );

        app.use(
            "/libraries/bootstrap-select",
            express.static(__dirname + "/node_modules/bootstrap-select")
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

        app.use(
            favicon(
                path.join(
                    __dirname,
                    "public",
                    "images",
                    "favicons",
                    "favicon.ico"
                )
            )
        );

        app.use((req, res, next) => {
            res.locals.isAuthenticated = req.session.isLoggedIn;
            next();
        });
        app.use("/docs", express.static(__basedir + "/docs"));

        app.use(require("./routes"));

        app.get("/500", errorController.get500);

        app.use(errorController.get404);

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
