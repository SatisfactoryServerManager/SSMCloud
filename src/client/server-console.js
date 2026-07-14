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
        const $wrapper = $("#agent-tasks-wrapper");

        if ($wrapper.length == 0) {
            return;
        }

        // Empty responses arrive as null because protobuf omits empty repeated
        // fields, so guard before reading length.
        tasks = tasks || [];

        $wrapper.empty();

        if (tasks.length == 0) {
            $wrapper.append($("<p/>").addClass("empty-note").text("No tasks have run on this server yet."));
        }

        for (let i = 0; i < tasks.length; i++) {
            $wrapper.append(this.buildAgentTaskRow(tasks[i]));
        }

        // The panel is closed most of the time, so the button carries the only
        // signal that something is queued or in flight.
        const active = tasks.filter((t) => t.status == "pending" || t.status == "running").length;
        const $btn = $("#server-tasks-btn");
        $btn.toggleClass("has-active", active > 0);
        $("#server-tasks-count").text(active);
    }

    buildAgentTaskRow(t) {
        // omitempty drops zero-valued numbers, so they arrive as undefined.
        const status = t.status || "";
        const attempts = t.attempts || 0;
        const progress = t.progress || 0;
        const running = status == "running";

        const $row = $("<div/>").addClass(`agent-task agent-task-${status}`);

        $row.append($("<span/>").addClass("task-rail"));

        const $head = $("<div/>").addClass("task-head");
        $head.append(
            $("<span/>")
                .addClass("task-action")
                .text(t.action || ""),
        );
        $head.append($("<span/>").addClass("task-status").text(status));

        // An attempt count only says something once a task has actually retried.
        // Printing (1/5) on every first-try success is noise that reads like a
        // warning.
        if (attempts > 1) {
            $head.append(
                $("<span/>")
                    .addClass("task-attempts")
                    .attr("title", `Attempt ${attempts} of ${t.max_attempts || 0}`)
                    .text(`retry ${attempts - 1}`),
            );
        }
        $row.append($head);

        const $detail = $("<div/>").addClass("task-detail");

        if (running) {
            const $bar = $("<div/>").addClass("task-progress");
            $bar.append($("<div/>").addClass("task-progress-bar").css("width", `${progress}%`));

            $detail.append($bar);
            $detail.append($("<span/>").addClass("task-pct").text(`${progress}%`));
        }

        // last_error outlives the run that produced it, so a task that failed and
        // then recovered still carries one. Only show it while it is the reason for
        // the current state.
        const failed = status == "dead" || status == "cancelled";
        if (failed && t.last_error) {
            $detail.append($("<span/>").addClass("task-message err").text(t.last_error));
        } else if (running && t.message) {
            $detail.append($("<span/>").addClass("task-message").text(t.message));
        }
        $row.append($detail);

        $row.append($("<span/>").addClass("task-time").text(this.agentTaskTime(t, status)));

        $row.append(
            $("<span/>")
                .addClass("task-trigger")
                .text(t.triggered_by_type || ""),
        );

        const $act = $("<div/>").addClass("task-act");
        if (status == "pending" || running) {
            $act.append($("<button/>").addClass("op agent-task-cancel-btn").attr("data-task-id", t.id).text("Cancel"));
        } else if (status == "dead") {
            $act.append($("<button/>").addClass("op agent-task-retry-btn").attr("data-task-id", t.id).text("Retry"));
        }
        $row.append($act);

        return $row;
    }

    // A task list with no time in it cannot be read as a log. Show the duration
    // once a task has run, and how long it has been waiting before that.
    agentTaskTime(t, status) {
        const created = t.created_at || 0;
        const started = t.started_at || 0;
        const finished = t.finished_at || 0;
        const now = Math.floor(Date.now() / 1000);

        if (finished && started) {
            return `${this.agentTaskSpan(finished - started)} · ${this.agentTaskAgo(finished)}`;
        }
        if (status == "running" && started) {
            return this.agentTaskSpan(now - started);
        }
        if (created) {
            return `queued ${this.agentTaskAgo(created)}`;
        }
        return "";
    }

    agentTaskSpan(secs) {
        secs = Math.max(0, secs);

        if (secs < 60) {
            return `${secs}s`;
        }
        if (secs < 3600) {
            return `${Math.floor(secs / 60)}m ${secs % 60}s`;
        }
        return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
    }

    agentTaskAgo(unix) {
        const secs = Math.max(0, Math.floor(Date.now() / 1000) - unix);

        if (secs < 60) {
            return "just now";
        }
        if (secs < 3600) {
            return `${Math.floor(secs / 60)}m ago`;
        }
        if (secs < 86400) {
            return `${Math.floor(secs / 3600)}h ago`;
        }
        return `${Math.floor(secs / 86400)}d ago`;
    }

    onStatusRecieved(event) {
        try {
            const prevStatus = this.status;
            this.status = event.detail;

            this.renderCmdHead();

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

    // The header is rendered server-side on page load and then goes stale, so
    // keep it in step with the status poll instead of waiting for a reload.
    renderCmdHead() {
        const $head = $("#server-cmd-head");
        if ($head.length == 0) {
            return;
        }

        const online = !!this.status.online;
        const running = !!this.status.running;

        $head.toggleClass("is-offline", !online);

        $("#server-status-lamp")
            .removeClass("on off run pulse")
            .addClass(online ? (running ? "run pulse" : "on") : "off");

        $("#server-status-text").text(running ? "Running" : online ? "Online" : "Offline");

        const sfVersion = this.status.installed_sf_version || 0;
        if (sfVersion) {
            $("#server-sf-version").text(sfVersion);
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

            var date = new Date(1970, 0, 1); // Epoch
            date.setSeconds(stat.created_at.seconds);

            cpuStats.push({
                date: date.getHours().pad(2) + ":" + date.getMinutes().pad(2) + ":" + date.getSeconds().pad(2),
                value: parseFloat(stat.cpu || 0),
            });
            memStats.push({
                date: date.getHours().pad(2) + ":" + date.getMinutes().pad(2) + ":" + date.getSeconds().pad(2),
                value: parseFloat(stat.mem || 0),
            });
            const runningVal = stat.running ? 1 : -1;
            runningStats.push({
                date: date.getHours().pad(2) + ":" + date.getMinutes().pad(2) + ":" + date.getSeconds().pad(2),
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
