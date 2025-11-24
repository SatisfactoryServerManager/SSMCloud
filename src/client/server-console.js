const ws = require("./ws");

class ServerConsole extends EventTarget {
    constructor() {
        super();
        this.agentId = window.location.href.substring(window.location.href.lastIndexOf("/") + 1);
        this.status = {
            running: false,
            installed: false,
            online: true,
        };
        this.lastLogIndex = 0;
        this.resetLogViewCounter = 0;

        this.cpuChart = null;
        this.ramChart = null;
        this.uptimeChart = null;
    }

    init() {
        if ($(".server-console").length == 0) {
            return;
        }

        this.$serverConsole = $(".server-console");

        $("body")
            .on("click", "#server-console-start-btn", (e) => {
                e.preventDefault();
                ws.sendServerAction(this.agentId, "startsfserver");
            })
            .on("click", "#server-console-stop-btn", (e) => {
                e.preventDefault();
                ws.sendServerAction(this.agentId, "stopsfserver");
            })
            .on("click", "#server-console-kill-btn", (e) => {
                e.preventDefault();
                ws.sendServerAction(this.agentId, "killsfserver");
            });

        ws.addEventListener("console.agent.status", (event) => {
            this.onStatusRecieved(event);
        });
        ws.addEventListener("console.agent.logs", (event) => {
            this.onLogsRecieved(event);
        });

        ws.addEventListener("console.agent.stats", (event) => {
            this.onStatsRecieved(event);
        });

        this.addEventListener("statusUpdated", this.onStatusUpdated);

        this.startTimer();
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.getAgentStatus();
            this.getAgentLogs();
            this.getAgentStats();
        }, 1000);
    }

    deepEqual(x, y) {
        if (x === y) {
            return true;
        } else if (typeof x == "object" && x != null && typeof y == "object" && y != null) {
            if (Object.keys(x).length != Object.keys(y).length) return false;

            for (var prop in x) {
                if (y.hasOwnProperty(prop)) {
                    if (!this.deepEqual(x[prop], y[prop])) return false;
                } else return false;
            }

            return true;
        } else return false;
    }

    getAgentStatus() {
        const requestData = {
            action: "console.agent.status",
            agentId: this.agentId,
        };
        ws.send(requestData);
    }

    getAgentLogs() {
        if (!this.status.running) {
            return;
        }

        const requestData = {
            action: "console.agent.logs",
            agentId: this.agentId,
            lastLogIndex: this.lastLogIndex,
        };
        ws.send(requestData);
    }

    getAgentStats() {
        const requestData = {
            action: "console.agent.stats",
            agentId: this.agentId,
        };
        ws.send(requestData);
    }

    onStatusRecieved(event) {
        try {
            const prevStatus = this.status;
            this.status = event.detail;

            if (!this.deepEqual(prevStatus.installed, this.status.installed)) {
                this.dispatchEvent(new Event("statusUpdated"));
            }
            if (!this.deepEqual(prevStatus.online, this.status.online)) {
                this.dispatchEvent(new Event("statusUpdated"));
            }
            if (!this.deepEqual(prevStatus.running, this.status.running)) {
                this.dispatchEvent(new Event("statusUpdated"));
            }
        } catch (err) {
            console.error(err);
        }
    }

    onStatusUpdated() {
        console.log("status Updated");

        const $startBtn = $("#server-console-start-btn");
        const $stopBtn = $("#server-console-stop-btn");
        const $killBtn = $("#server-console-kill-btn");

        if (!this.status.online) {
            $startBtn.addClass("disabled");
            $startBtn.find("button").prop("disabled", true);
            $stopBtn.addClass("disabled");
            $stopBtn.find("button").prop("disabled", true);
            $killBtn.addClass("disabled");
            $killBtn.find("button").prop("disabled", true);

            this.$serverConsole.html("<p>server is currently offline</p>");
            return;
        }

        if (!this.status.running) {
            $startBtn.removeClass("disabled");
            $startBtn.find("button").prop("disabled", false);

            $stopBtn.addClass("disabled");
            $stopBtn.find("button").prop("disabled", true);
            $killBtn.addClass("disabled");
            $killBtn.find("button").prop("disabled", true);

            this.$serverConsole.html("<p>server is not running</p>");
        } else {
            $startBtn.addClass("disabled");
            $startBtn.find("button").prop("disabled", true);

            $stopBtn.removeClass("disabled");
            $stopBtn.find("button").prop("disabled", false);
            $killBtn.removeClass("disabled");
            $killBtn.find("button").prop("disabled", false);
        }
    }

    onLogsRecieved(event) {
        let logLines = event.detail.filter(Boolean); // removes null/undefined/empty safely

        this.resetLogViewCounter++;
        if (this.resetLogViewCounter === 120) {
            this.resetLogViewCounter = 0;
            this.$serverConsole.empty();
            this.lastLogIndex = 0;
        }

        if (logLines.length === 0) return;
        this.lastLogIndex += logLines.length;

        let html = "";
        for (const line of logLines) {
            const lower = line.toLowerCase();
            if (lower.includes("warning:")) {
                html += `<p class="text-warning">${line}</p>\n`;
            } else if (lower.includes("error:")) {
                html += `<p class="text-danger">${line}</p>\n`;
            } else {
                html += `<p>${line}</p>`;
            }
        }

        if (html == "") return;

        // 🔥 Single DOM update instead of hundreds
        this.$serverConsole.append(html);

        // Delay scroll update to next frame for smoother UI
        requestAnimationFrame(() => {
            this.$serverConsole.scrollTop(this.$serverConsole.prop("scrollHeight"));
        });
    }
    onStatsRecieved(event) {
        const stats = event.detail;
        let count = 0;

        const cpuStats = [];
        const memStats = [];
        const runningStats = [];
        const runningBgColor = [];

        for (let i = stats.length - 1; i >= 0; i--) {
            if (count >= 50) {
                break;
            }
            const stat = stats[i];

            const date = new Date(stat.createdAt);

            cpuStats.push({
                date: date.getHours().pad(2) + ":" + date.getMinutes().pad(2) + ":" + date.getSeconds().pad(2),
                value: parseFloat(stat.cpu),
            });
            memStats.push({
                date: date.getHours().pad(2) + ":" + date.getMinutes().pad(2) + ":" + date.getSeconds().pad(2),
                value: parseFloat(stat.mem),
            });
            const runningVal = stat.running ? 1 : -1;
            runningStats.push({
                date: date.getHours().pad(2) + ":" + date.getMinutes().pad(2) + ":" + date.getSeconds().pad(2),
                value: runningVal,
            });

            if (!stat.running) {
                runningBgColor.push("rgba(255, 99, 132, 0.7)");
            } else {
                runningBgColor.push("rgba(75, 192, 192, 0.7)");
            }

            count++;
        }

        cpuStats.reverse();
        memStats.reverse();
        runningStats.reverse();
        runningBgColor.reverse();

        this.BuildAgentCPUStats(cpuStats);
        this.BuildAgentRAMStats(memStats);
        this.BuildAgentRunningStats(runningStats, runningBgColor);
    }

    BuildAgentCPUStats(data) {
        const textColour = $("body").hasClass("dark") ? "white" : "black";
        const gridColour = $("body").hasClass("dark") ? "#253a4b" : "black";

        if (this.cpuChart != null) {
            this.cpuChart.data.datasets[0].data = data.map((row) => row.value);
            this.cpuChart.data.labels = data.map((row) => row.date);
            this.cpuChart.update();
            return;
        }

        this.cpuChart = new Chart(document.getElementById("cpuChart"), {
            type: "line",
            data: {
                labels: data.map((row) => row.date),
                datasets: [
                    {
                        label: "Percent",
                        data: data.map((row) => row.value),
                    },
                ],
            },
            options: {
                plugins: {
                    legend: {
                        labels: {
                            color: textColour,
                        },
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: textColour,
                        },
                        grid: {
                            color: gridColour,
                        },
                    },
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: textColour,
                        },
                        grid: {
                            color: gridColour,
                        },
                    },
                },
            },
        });
    }

    BuildAgentRAMStats(data) {
        const textColour = $("body").hasClass("dark") ? "white" : "black";

        if (this.ramChart != null) {
            this.ramChart.data.datasets[0].data = data.map((row) => row.value);
            this.ramChart.data.labels = data.map((row) => row.date);
            this.ramChart.update();
            return;
        }

        this.ramChart = new Chart(document.getElementById("ramChart"), {
            type: "line",
            data: {
                labels: data.map((row) => row.date),
                datasets: [
                    {
                        label: "Percent",
                        data: data.map((row) => row.value),
                    },
                ],
            },
            options: {
                plugins: {
                    legend: {
                        labels: {
                            color: textColour,
                        },
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            color: textColour,
                        },
                    },
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: textColour,
                        },
                    },
                },
            },
        });
    }

    BuildAgentRunningStats(data, backgroundColor) {
        const textColour = $("body").hasClass("dark") ? "white" : "black";

        if (this.uptimeChart != null) {
            this.uptimeChart.data.datasets[0].data = data.map((row) => row.value);
            this.uptimeChart.data.labels = data.map((row) => row.date);
            this.uptimeChart.data.datasets[0].backgroundColor = backgroundColor;
            this.uptimeChart.update();
            return;
        }

        this.uptimeChart = new Chart(document.getElementById("uptimeChart"), {
            type: "bar",
            data: {
                labels: data.map((row) => row.date),
                datasets: [
                    {
                        label: "Running",
                        data: data.map((row) => row.value),
                        backgroundColor,
                    },
                ],
            },
            options: {
                plugins: {
                    legend: {
                        labels: {
                            color: textColour,
                        },
                    },
                },
                scales: {
                    y: {
                        min: -1,
                        max: 1,
                        ticks: {
                            color: textColour,
                            stepSize: 1,
                        },
                    },
                    x: {
                        ticks: {
                            color: textColour,
                        },
                    },
                },
            },
        });
    }
}

serverConsole = new ServerConsole();
module.exports = serverConsole;
