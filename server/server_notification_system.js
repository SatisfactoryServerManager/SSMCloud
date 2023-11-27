const Config = require("./server_config");
const Logger = require("./server_logger");

const NotificationModel = require("../models/intergration_notification");
const NotificationEventModel = require("../models/intergration_notification_event");
const NotificationEventTypeModel = require("../models/intergration_event_type");
const AccountModel = require("../models/account");

const WebHooks = require("node-webhooks");

const { Webhook, MessageBuilder } = require("discord-webhook-node");

class NotificationSystem {
    init = async () => {
        this.webHooks = new WebHooks({
            db: {},
            httpSuccessCodes: [200, 201, 202, 203, 204],
        });

        var emitter = this.webHooks.getEmitter();

        emitter.on("*.success", async (shortname, statusCode, body) => {
            const Notification = await NotificationModel.findOne({
                _id: shortname,
            });

            if (Notification) {
                Notification.completed = true;

                this.webHooks.remove(shortname);

                await Notification.populate("events");
                const lastEventIndex = Notification.events.length - 1;
                const lastEvent = Notification.events[lastEventIndex];

                if (lastEvent) {
                    lastEvent.lastResponseCode = statusCode;
                    lastEvent.lastResponseData = body || "";
                    await lastEvent.save();
                }

                await Notification.save();
            }

            console.log(
                "Success on trigger webHook " + shortname + " with status code",
                statusCode,
                "and body",
                body
            );
        });

        emitter.on("*.failure", async (shortname, statusCode, body) => {
            const Notification = await NotificationModel.findOne({
                _id: shortname,
            });

            if (Notification) {
                Notification.retries += 1;

                if (Notification.retries >= 5) {
                    Notification.failed = true;
                    Notification.error = "Too Many Retries!";
                    this.webHooks.remove(shortname);
                }

                await Notification.populate("events");
                const lastEventIndex = Notification.events.length - 1;
                const lastEvent = Notification.events[lastEventIndex];

                if (lastEvent) {
                    lastEvent.lastResponseCode = statusCode;
                    lastEvent.lastResponseData = body || "";
                    await lastEvent.save();
                }

                await Notification.save();
            }

            console.error(
                "Error on trigger webHook " + shortname + " with status code",
                statusCode,
                "and body",
                body
            );
        });

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

        await theAccount.populate("intergrations");

        for (let i = 0; i < theAccount.intergrations.length; i++) {
            const intergration = theAccount.intergrations[i];
            await intergration.populate("eventTypes");

            const hasEventType = intergration.eventTypes.find(
                (et) => et.eventTypeName == theEventType.eventTypeName
            );

            if (hasEventType) {
                const theNotification = await NotificationModel.create({
                    intergration,
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
            await notification.populate("intergration");
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

        if (Notification.intergration.type == "webhook") {
            await this.DispatchWebhookEvent(Notification, theEvent);
        } else if (Notification.intergration.type == "discord") {
            await this.DispatchDiscordEvent(Notification, theEvent);
        }
    };

    DispatchWebhookEvent = async (Notification, Event) => {
        try {
            const shortName = Notification._id.toString();

            await this.webHooks.add(shortName, Notification.intergration.url);

            this.webHooks.trigger(shortName, Event.eventData);
        } catch (err) {
            console.log(err);
        }
    };

    DispatchDiscordEvent = async (Notification, Event) => {
        const SSMLogo =
            "https://ssmcloud.hostxtra.co.uk/public/images/ssm_logo128.png";

        const url = Notification.intergration.url;
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
            const customHeaders = {
                "Content-Type": "application/json",
            };

            await fetch(url, {
                method: "POST",
                headers: customHeaders,
                body: JSON.stringify({
                    event_type: "test",
                    data: {},
                }),
            });
        } catch (err) {
            throw err;
        }
    };
}

const notificationSystem = new NotificationSystem();
module.exports = notificationSystem;
