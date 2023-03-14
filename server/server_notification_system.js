const Config = require("./server_config");
const Logger = require("./server_logger");

const NotificationModel = require("../models/notification");
const NotificationEventModel = require("../models/notification_event");
const NotificationEventTypeModel = require("../models/notification_event_type");
const AccountModel = require("../models/account");

const axios = require("axios");

const { Webhook, MessageBuilder } = require("discord-webhook-node");

class NotificationSystem {
    init = async () => {
        await this.SetupNotificationEvents();
        await this.ProcessPendingNotifications();

        setInterval(async () => {
            await this.ProcessPendingNotifications();
        }, 1 * 60 * 1000);
    };

    SetupNotificationEvents = async () => {
        Logger.debug("[APP] - Checking Notification Event Types DB Collection");
        const eventTypes = [
            { name: "agent.created", description: "Agent has been created" },
            { name: "agent.delete", description: "Agent has been deleted" },
            { name: "agent.online", description: "Agent is online" },
            { name: "agent.offline", description: "Agent is offline" },
            { name: "agent.sf.starting", description: "Server is starting" },
            { name: "agent.sf.running", description: "Server is running" },
            { name: "agent.sf.stopping", description: "Server is stopping" },
            { name: "agent.sf.stopped", description: "Server is stopped" },
            {
                name: "agent.sf.playerjoined",
                description: "Player joined the server",
            },
            {
                name: "agent.sf.playerleave",
                description: "Player left the server",
            },
            {
                name: "agent.cpu.80",
                description: "Agent CPU > 80%",
            },
            {
                name: "agent.cpu.90",
                description: "Agent CPU > 90%",
            },
            {
                name: "agent.ram.80",
                description: "Agent RAM > 80%",
            },
            {
                name: "agent.ram.90",
                description: "Agent RAM > 90%",
            },
        ];

        for (let i = 0; i < eventTypes.length; i++) {
            const eventType = eventTypes[i];
            const existingEventType = await NotificationEventTypeModel.findOne({
                eventTypeName: eventType.name,
            });

            if (existingEventType == null) {
                await NotificationEventTypeModel.create({
                    eventTypeName: eventType.name,
                    description: eventType.description,
                });
            } else {
                existingEventType.description = eventType.description;
                await existingEventType.save();
            }
        }

        Logger.debug("[APP] - Checked Notification Event Types DB Collection");
    };

    CreateNotification = async (eventType, eventData, AccountID) => {
        if (eventType == "") return;

        const theAccount = await AccountModel.findOne({
            _id: AccountID,
        }).select("+notifications");

        if (theAccount == null) {
            throw new Error(`Account (${AccountID}) was Null!`);
        }

        const theEventType = await NotificationEventTypeModel.findOne({
            eventTypeName: eventType,
        });
        if (theEventType == null) {
            throw new Error(`Event Type (${eventType}) was Null!`);
        }

        await theAccount.populate("notificationSettings");

        for (let i = 0; i < theAccount.notificationSettings.length; i++) {
            const notificationSetting = theAccount.notificationSettings[i];
            await notificationSetting.populate("eventTypes");

            const hasEventType = notificationSetting.eventTypes.find(
                (et) => et.eventTypeName == theEventType.eventTypeName
            );

            if (hasEventType) {
                const theNotification = await NotificationModel.create({
                    notificationSetting,
                    eventType: theEventType,
                    data: eventData,
                });

                theAccount.notifications.push(theNotification);
                await theAccount.save();
            } else {
                console.log(
                    `theAccount is not listening for event ${eventType}`
                );
            }
        }
    };

    ProcessPendingNotifications = async () => {
        Logger.debug("[NotificationSystem] - Processing Pending Notifications");
        const allNotifications = await NotificationModel.find({
            completed: false,
            failed: false,
            retries: { $lt: 5 },
        });

        for (let i = 0; i < allNotifications.length; i++) {
            const notification = allNotifications[i];
            await notification.populate("notificationSetting");
            await notification.populate("eventType");
            await this.CreateEventForNotification(notification);
        }

        Logger.debug(
            "[NotificationSystem] - Finished Processing Pending Notifications"
        );
    };

    CreateEventForNotification = async (Notification) => {
        const eventData = {
            event_type: Notification.eventType.eventTypeName,
            data: Notification.data,
        };

        const theEvent = await NotificationEventModel.create({
            eventData,
        });

        Notification.events.push(theEvent);
        await Notification.save();

        if (Notification.notificationSetting.notificationType == "webhook") {
            await this.DispatchWebhookEvent(Notification, theEvent);
        } else if (
            Notification.notificationSetting.notificationType == "discord"
        ) {
            await this.DispatchDiscordEvent(Notification, theEvent);
        }
    };

    DispatchWebhookEvent = async (Notification, Event) => {
        try {
            const url = Notification.notificationSetting.url;
            const res = await axios.post(url, Event.eventData);

            if (res.status == 200) {
                Event.lastResponseCode = res.status;
                Event.lastResponseData = res.data;
                await Event.save();
                Notification.completed = true;
                await Notification.save();
            }
        } catch (err) {
            const res = err.response;
            Event.lastResponseCode = res.status;
            Event.lastResponseData = res.data;
            await Event.save();
            Notification.completed = false;
            Notification.retries += 1;
            if (Notification.retries >= 5) {
                Notification.failed = true;
                Notification.error = "Too Many Retries!";
            }
            await Notification.save();
        }
    };

    DispatchDiscordEvent = async (Notification, Event) => {
        const SSMLogo =
            "https://ssmcloud.hostxtra.co.uk/public/images/ssm_logo128.png";

        const url = Notification.notificationSetting.url;
        try {
            const hook = new Webhook(url);
            hook.setUsername("SSM Notifier");
            hook.setAvatar(SSMLogo);

            const embed = new MessageBuilder()
                .setTitle(Notification.eventType.description)
                .setColor("#00b0f4")
                .setDescription(Notification.eventType.description)
                .setTimestamp();

            if (Event.eventData.data) {
                const data = Event.eventData.data;
                if (data.hasOwnProperty("agent_name")) {
                    embed.addField("**Agent:**", data.agent_name);
                }

                if (data.hasOwnProperty("agent_id")) {
                    embed.addField("**Agent Id:**", data.agent_id);
                }

                if (data.hasOwnProperty("player_name")) {
                    embed.addField("**Player:**", data.player_name);
                }
            }
            await hook.send(embed);
            Event.lastResponseCode = 200;
            Event.lastResponseData = {
                success: true,
            };
            await Event.save();
            Notification.completed = true;
            await Notification.save();
        } catch (err) {
            Event.lastResponseCode = 500;
            Event.lastResponseData = {
                success: false,
                error: err.message,
            };
            await Event.save();

            Notification.completed = false;
            Notification.retries += 1;
            if (Notification.retries >= 5) {
                Notification.failed = true;
                Notification.error = "Too Many Retries!";
            }
            await Notification.save();
        }
    };

    TestWebhook = async (url) => {
        try {
            await axios.post(url, {
                event_type: "test",
                data: {},
            });
        } catch (err) {
            throw err;
        }
    };
}

const notificationSystem = new NotificationSystem();
module.exports = notificationSystem;
