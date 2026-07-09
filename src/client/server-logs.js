const ws = require("./ws");

// Live log viewer for the server detail "Logs" tab. Streams both the SSM
// (Agent) and Satisfactory (FactoryGame) logs over the websocket, appending
// new lines as they arrive so the terminals update in real time.
class ServerLogs {
    constructor() {
        this.agentId = window.location.href.substring(
            window.location.href.lastIndexOf("/") + 1,
        );
        this.logTypes = ["Agent", "FactoryGame"];
        this.lastIndex = {};
        this.viewers = {};
        this.maxLines = 2000;
    }

    init() {
        if ($(".log-viewer[data-logtype]").length === 0) {
            return;
        }

        this.logTypes.forEach((type) => {
            this.lastIndex[type] = 0;
            this.viewers[type] = $(`.log-viewer[data-logtype="${type}"]`);
            // The websocket is the source of truth for the live view, so clear
            // the server-rendered snapshot before streaming from the start.
            this.viewers[type].empty();
        });

        ws.addEventListener("console.agent.logfile", (event) => {
            this.onLogsReceived(event);
        });

        this.startTimer();
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.logTypes.forEach((type) => this.requestLog(type));
        }, 2000);
    }

    requestLog(type) {
        ws.send({
            action: "console.agent.logfile",
            agentId: this.agentId,
            logType: type,
            lastLogIndex: this.lastIndex[type],
        });
    }

    onLogsReceived(event) {
        const detail = event.detail || {};
        const type = detail.logType;
        const $viewer = this.viewers[type];
        if (!$viewer || $viewer.length === 0) {
            return;
        }

        const logLines = (detail.logLines || []).filter(Boolean);
        if (logLines.length === 0) {
            return;
        }

        this.lastIndex[type] += logLines.length;

        let html = "";
        for (const line of logLines) {
            const lower = line.toLowerCase();
            if (lower.includes("warning:")) {
                html += `<p class="text-warning">${line}</p>`;
            } else if (lower.includes("error:")) {
                html += `<p class="text-danger">${line}</p>`;
            } else {
                html += `<p>${line}</p>`;
            }
        }
        if (html === "") {
            return;
        }

        $viewer.append(html);

        // Bound memory: keep only the most recent lines in the DOM.
        const $lines = $viewer.children("p");
        if ($lines.length > this.maxLines) {
            $lines.slice(0, $lines.length - this.maxLines).remove();
        }

        requestAnimationFrame(() => {
            $viewer.scrollTop($viewer.prop("scrollHeight"));
        });
    }
}

const serverLogs = new ServerLogs();
module.exports = serverLogs;
