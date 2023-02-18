const Config = require("./server_config");
const Logger = require("./server_logger");

const AgentHandler = require("./server_agent_handler");
const ModManager = require("./server_mod_manager");
const NotificationSystem = require("./server_notification_system");
const GamePlayerHandler = require("./server_game_player_handler");

const UserRoleModel = require("../models/user_role");
const PermissionModel = require("../models/permission");

class ServerApp {
    init = async () => {
        await this.CheckDBPermissionsCollection();
        AgentHandler.init();
        await ModManager.init();
        await NotificationSystem.init();
        GamePlayerHandler.init();
    };

    CheckDBPermissionsCollection = async () => {
        Logger.debug("[APP] - Checking Permissions DB Collection");
        const permissions = [
            { name: "page.dashboard", description: "View Dashboard Page" },
            { name: "page.servers", description: "View Servers Page" },
            { name: "page.server", description: "View Server Page" },
            { name: "page.backups", description: "View Backups Page" },
            { name: "page.account", description: "View Accounts Page" },
            { name: "page.logs", description: "View Logs Page" },
            { name: "page.mods", description: "View Mods Page" },
            { name: "page.saves", description: "View Saves Page" },
            {
                name: "page.notifications",
                description: "View Notifications Page",
            },
            { name: "user.create", description: "Create A New User" },
            { name: "user.delete", description: "Delete User" },
            { name: "user.update", description: "Update User" },
            { name: "user.apikey.create", description: "Create User API Key" },
            { name: "user.apikey.delete", description: "Delete User API Key" },
            { name: "userrole.create", description: "Create User Role" },
            { name: "userrole.delete", description: "Delete User Role" },
            { name: "userrole.update", description: "Update User Role" },
            { name: "server.create", description: "Create Server" },
            { name: "server.update", description: "Update Server" },
            { name: "server.delete", description: "Delete Server" },
            { name: "server.mods.install", description: "Install Mod" },
            { name: "server.mods.uninstall", description: "Uninstall Mod" },
            { name: "server.mods.update", description: "Update Mod" },
            { name: "serveraction.start", description: "Start Server" },
            { name: "serveraction.stop", description: "Stop Server" },
            { name: "serveraction.kill", description: "Kill Server" },
            { name: "serveraction.install", description: "Install Server" },
            { name: "serveraction.update", description: "Update Server" },
            { name: "backup.download", description: "Download Backup File" },
            { name: "saves.upload", description: "Upload Save File" },
            { name: "saves.download", description: "Download Save File" },
            {
                name: "notifications.create",
                description: "Create Notification Setting",
            },
            {
                name: "notifications.update",
                description: "Update Notification Settings",
            },
        ];

        for (let i = 0; i < permissions.length; i++) {
            const permission = permissions[i];
            const existingPermission = await PermissionModel.findOne({
                permissionName: permission.name,
            });

            if (existingPermission == null) {
                await PermissionModel.create({
                    permissionName: permission.name,
                    description: permission.description,
                });
            } else {
            }
        }

        const roles = await UserRoleModel.find({ roleName: "Administrator" });
        const AllPermissions = await PermissionModel.find();

        for (let i = 0; i < roles.length; i++) {
            const role = roles[i];
            if (role.permissions.length != AllPermissions.length) {
                role.permissions = AllPermissions;
                await role.save();
            }
        }

        Logger.debug("[APP] - Checked! Permissions DB Collection");
    };
}

const serverApp = new ServerApp();
module.exports = serverApp;
