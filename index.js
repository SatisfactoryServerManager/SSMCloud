global.__basedir = __dirname;

const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const helmet = require("helmet");
const compression = require("compression");
const favicon = require("serve-favicon");
const cors = require("cors");
const methodOverride = require("method-override");
const fs = require("fs-extra");
const morgan = require("morgan");

/* SSM Server Utils */

const Config = require("./server/server_config");
const Logger = require("./server/server_Logger");

/* End SSM Server Utils */

/* Controllers */

const errorController = require("./controllers/error");

process.on("uncaughtException", function (err) {
    console.error(err);
    fs.writeFileSync("log.txt", err.message);
    process.exit(1);
});

class SSMCloud_App {
    constructor() {
        this.init();
    }

    init = async () => {
        Logger.init();
        Logger.info("[APP] [PREINIT] - Loading Configs..");
        await Config.load();
        Logger.info("[APP] [PREINIT] - Starting SSM..");
        this.startExpress();
    };

    startExpress() {
        this.MONGODB_URI = `mongodb://${Config.get(
            "ssm.db.user"
        )}:${encodeURIComponent(Config.get("ssm.db.pass"))}@${Config.get(
            "ssm.db.host"
        )}/${Config.get("ssm.db.database")}`;

        const app = express();
        const store = new MongoDBStore({
            uri: this.MONGODB_URI,
            collection: "sessions",
        });

        app.set("trust proxy", "127.0.0.1");

        // Secret used for signing/hashing token is stored in session by default
        const csrfProtection = csrf();

        var cookieParser = require("cookie-parser");

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
            next();
        });

        const rawBodyBuffer = (req, res, buf, encoding) => {
            if (buf && buf.length) {
                req.rawBody = buf.toString(encoding || "utf8");
            }
        };

        // methodOverride
        app.use(methodOverride("_method"));

        app.use(cookieParser());

        app.use(
            bodyParser.urlencoded({
                verify: rawBodyBuffer,
                extended: true,
            })
        );
        app.use(
            bodyParser.json({
                verify: rawBodyBuffer,
            })
        );

        app.use(helmet());
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
            session({
                secret: "my secret",
                resave: false,
                saveUninitialized: false,
                store,
            })
        );

        const APIRoutes = require("./routes/api");
        app.use("/api", APIRoutes);

        app.use(csrfProtection);
        app.use(flash());

        app.use(
            favicon(path.join(__dirname, "public", "images", "favicon.ico"))
        );

        app.use((req, res, next) => {
            // Locals field: Express feature for setting local variables that are passed into views. For every request that is executed, these fields are set for view that is rendered
            res.locals.isAuthenticated = req.session.isLoggedIn;
            res.locals.csrfToken = req.csrfToken();
            next();
        });

        const AuthRoutes = require("./routes/auth");
        const DashboardRoutes = require("./routes/dashboard");

        app.use(morgan("combined"));

        app.use(AuthRoutes);
        app.use(DashboardRoutes);

        app.get("/500", errorController.get500);

        app.use(errorController.get404);

        // Error-handling middleware. Express executes this middleware when you call next() with an error passed to it
        app.use((error, req, res, next) => {
            res.status(500).render("500", {
                pageTitle: "Server Error",
                path: "/500",
                isAuthenticated: req.session.isLoggedIn,
                errorMessage: error.message,
            });
        });

        mongoose.set("strictQuery", false);

        mongoose
            .connect(this.MONGODB_URI, {
                useUnifiedTopology: true,
                useNewUrlParser: true,
            })
            .then(() => {
                Logger.debug("[APP] - Connected to DB!");
                Logger.info(
                    `[APP] - Listening on port: ${Config.get("ssm.http_port")}`
                );
                app.listen(Config.get("ssm.http_port"));
            })
            .catch((err) => {
                Logger.error("[APP] - Failed to connect to DB!");
                console.log(err);
            });
    }
}

new SSMCloud_App();
