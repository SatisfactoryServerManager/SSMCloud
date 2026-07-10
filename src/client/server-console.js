const ws = require("./ws");

class ServerConsole extends EventTarget {
    constructor() {
        super();
        this.agentId = window.location.href.substring(
            window.location.href.lastIndexOf("/") + 1,
        );
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
            })
            .on("click", ".agent-task-cancel-btn", (e) => {
                e.preventDefault();
                const taskId = $(e.currentTarget).attr("data-task-id");
                ws.send({
                    action: "console.agent.task.cancel",
                    agentId: this.agentId,
                    taskId: taskId,
                });
            })
            .on("click", ".agent-task-retry-btn", (e) => {
                e.preventDefault();
                const taskId = $(e.currentTarget).attr("data-task-id");
                ws.send({
                    action: "console.agent.task.retry",
                    agentId: this.agentId,
                    taskId: taskId,
                });
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

        ws.addEventListener("console.agent.tasks", (event) => {
            this.onTasksRecieved(event);
        });

        // A cancel/retry acknowledgement means the queue changed, so refresh
        // the list straight away instead of waiting for the next poll tick.
        ws.addEventListener("console.agent.task.cancel", () => {
            this.getAgentTasks();
        });
        ws.addEventListener("console.agent.task.retry", () => {
            this.getAgentTasks();
        });

        this.addEventListener("statusUpdated", this.onStatusUpdated);

        this.startTimer();
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.getAgentStatus();
            this.getAgentLogs();
            this.getAgentStats();
            this.getAgentTasks();
        }, 1000);
    }

    deepEqual(x, y) {
        if (x === y) {
            return true;
        } else if (
            typeof x == "object" &&
            x != null &&
            typeof y == "object" &&
            y != null
        ) {
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

    getAgentTasks() {
        const requestData = {
            action: "console.agent.tasks",
            agentId: this.agentId,
        };
        ws.send(requestData);
    }

    onTasksRecieved(event) {
        try {
            this.renderAgentTasks(event.detail || []);
        } catch (err) {
            console.error(err);
        }
    }

    renderAgentTasks(tasks) {
        const $card = $("#server-tasks-card");
        const $wrapper = $("#agent-tasks-wrapper");

        if ($wrapper.length == 0) {
            return;
        }

        // Empty responses arrive as null because protobuf omits empty repeated
        // fields, so guard before reading length.
        tasks = tasks || [];

        $card.toggleClass("hidden", tasks.length == 0);
        $wrapper.empty();

        for (let i = 0; i < tasks.length; i++) {
            const t = tasks[i];

            // omitempty drops zero-valued numbers, so they arrive as undefined.
            const attempts = t.attempts || 0;
            const maxAttempts = t.max_attempts || 0;
            const progress = t.progress || 0;
            const status = t.status || "";

            const $row = $("<div/>").addClass(`agent-task agent-task-${status}`);

            $row.append($("<span/>").addClass("task-action").text(t.action || ""));

            $row.append(
                $("<span/>")
                    .addClass("task-status")
                    .text(`${status} (${attempts}/${maxAttempts})`),
            );

            if (status == "running") {
                const $bar = $("<div/>").addClass("task-progress");
                $bar.append(
                    $("<div/>")
                        .addClass("task-progress-bar")
                        .css("width", `${progress}%`)
                        .text(`${progress}%`),
                );
                $row.append($bar);
            }

            if (status == "dead" && t.last_error) {
                $row.append(
                    $("<span/>").addClass("task-message err").text(t.last_error),
                );
            } else if (t.message) {
                $row.append(
                    $("<span/>").addClass("task-message").text(t.message),
                );
            }

            $row.append(
                $("<span/>")
                    .addClass("task-trigger")
                    .text(t.triggered_by_type || ""),
            );

            if (status == "pending" || status == "running") {
                $row.append(
                    $("<button/>")
                        .addClass("op agent-task-cancel-btn")
                        .attr("data-task-id", t.id)
                        .text("Cancel"),
                );
            } else if (status == "dead") {
                $row.append(
                    $("<button/>")
                        .addClass("op agent-task-retry-btn")
                        .attr("data-task-id", t.id)
                        .text("Retry"),
                );
            }

            $wrapper.append($row);
        }
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
            this.$serverConsole.scrollTop(
                this.$serverConsole.prop("scrollHeight"),
            );
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

            var date = new Date(1970, 0, 1); // Epoch
            date.setSeconds(stat.created_at.seconds);

            cpuStats.push({
                date:
                    date.getHours().pad(2) +
                    ":" +
                    date.getMinutes().pad(2) +
                    ":" +
                    date.getSeconds().pad(2),
                value: parseFloat(stat.cpu || 0),
            });
            memStats.push({
                date:
                    date.getHours().pad(2) +
                    ":" +
                    date.getMinutes().pad(2) +
                    ":" +
                    date.getSeconds().pad(2),
                value: parseFloat(stat.mem || 0),
            });
            const runningVal = stat.running ? 1 : -1;
            runningStats.push({
                date:
                    date.getHours().pad(2) +
                    ":" +
                    date.getMinutes().pad(2) +
                    ":" +
                    date.getSeconds().pad(2),
                value: runningVal,
            });

            if (!stat.running) {
                runningBgColor.push("rgba(255, 99, 132, 0.7)");
            } else {
                runningBgColor.push("rgba(63,208,122,0.7)");
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
                        borderColor: "#29CBF2",
                        backgroundColor: "rgba(41,203,242,0.15)",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
                            color: "#647085",
                        },
                        grid: {
                            color: "rgba(255,255,255,0.06)",
                        },
                    },
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: "#647085",
                        },
                        grid: {
                            color: "rgba(255,255,255,0.06)",
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
                        borderColor: "#F2B33A",
                        backgroundColor: "rgba(242,179,58,0.15)",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
                            color: "#647085",
                        },
                    },
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: "#647085",
                        },
                    },
                },
            },
        });
    }

    BuildAgentRunningStats(data, backgroundColor) {
        const textColour = $("body").hasClass("dark") ? "white" : "black";

        if (this.uptimeChart != null) {
            this.uptimeChart.data.datasets[0].data = data.map(
                (row) => row.value,
            );
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
                        borderColor: "#3FD07A",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
                            color: "#647085",
                            stepSize: 1,
                        },
                    },
                    x: {
                        ticks: {
                            color: "#647085",
                        },
                    },
                },
            },
        });
    }
}

serverConsole = new ServerConsole();
module.exports = serverConsole;
