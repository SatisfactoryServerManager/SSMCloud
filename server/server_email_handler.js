const nodemailer = require("nodemailer");
const hbs = require("handlebars");
const fs = require("fs-extra");

const config = require("./server_config");
const logger = require("./server_logger");

class Email {
    constructor(to, from, subject, html) {
        this.to = to;
        this.from = from;
        this.subject = subject;
        this.html = html;
    }

    getTo() {
        return this.to;
    }

    getFrom() {
        return this.from;
    }

    getSubject() {
        return this.subject;
    }

    getHTML() {
        return this.html;
    }
}

module.exports = Email;

class EmailHandler {
    constructor() {
        this._PendingIMAPMessages = [];
    }

    init() {
        if (config.get("ssm.mail.enabled") == false) {
            return;
        }

        this._transporter = nodemailer.createTransport(
            config.get("ssm.mail.transport")
        );

        this._transporter.verify(function (error, success) {
            if (error) {
                console.log(error);
            } else {
                logger.debug(
                    "[EmailHandler] - Mail Server is ready to take our messages"
                );
            }
        });
    }

    createEmail(to, subject, emailtemplate, data) {
        const source = fs.readFileSync(
            __basedir + "/src/templates/email/" + emailtemplate + ".hbs",
            "utf8"
        );

        var template = hbs.compile(source);
        var html = template(data);

        const NewEmail = new Email(
            to,
            config.get("ssm.mail.sender"),
            subject,
            html
        );

        return NewEmail;
    }

    sendEmail = async (Email) => {
        if (config.get("ssm.mail.enabled") == false) {
            return;
        }

        const emailData = {
            from: Email.getFrom(),
            to: Email.getTo(),
            subject: Email.getSubject(),
            text: Email.getSubject(),
            html: Email.getHTML(),
        };

        const consoleEmailData = {
            from: Email.getFrom(),
            to: Email.getTo(),
            subject: Email.getSubject(),
        };

        try {
            let info = await this._transporter.sendMail(emailData);

            logger.debug(`[EmailHandler] - Message sent: ${info.messageId}`);
        } catch (err) {
            console.log(err);
        }
    };
}

const emailHandler = new EmailHandler();

module.exports = emailHandler;
