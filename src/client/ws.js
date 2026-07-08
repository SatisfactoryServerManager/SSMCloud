class WS extends EventTarget {
    constructor() {
        super();
        this.pending = [];
    }

    init() {
        this.reconnect();

        this.addEventListener("error", this.onError);
        this.addEventListener(
            "global.agent.action",
            this.onServerActionReceived,
        );
    }

    reconnect() {
        const hostname = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : "";
        if (hostname === "localhost") {
            this.ws = new WebSocket(`ws://${hostname}${port}/dashboard/ws`);
        } else {
            this.ws = new WebSocket(`wss://${hostname}${port}/dashboard/ws`);
        }

        this.ws.onopen = () => {
            console.log("Connected to WebSocket");
            const queued = this.pending;
            this.pending = [];
            queued.forEach((data) => this.ws.send(data));
        };
        this.ws.onclose = (event) => {
            console.log("Connection closed", event.code, event.reason);
            console.log("Reconnecting..");
            this.reconnect();
        };
        this.ws.onerror = (err) => console.error(`Error: ${err.message}`);
        this.ws.onmessage = (event) => {
            const eventData = JSON.parse(event.data);
            const action = eventData.action;
            const data = eventData.data;

            const e = new CustomEvent(action, { detail: data });
            this.dispatchEvent(e);
        };
    }

    onError(event) {
        console.log("WS Error:", event.detail);
    }

    send(data) {
        const payload = JSON.stringify(data);
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.pending.push(payload);
            return;
        }
        this.ws.send(payload);
    }

    sendServerAction(agentId, serverAction) {
        const data = {
            action: "global.agent.action",
            agentId: agentId,
            serverAction: serverAction,
        };
        this.send(data);
    }

    onServerActionReceived(event) {
        let ToastMessage = "Starting server in the background";
        if (event.detail.serverAction == "stopsfserver") {
            ToastMessage = "Stopping server in the background";
        } else if (event.detail.serverAction == "killsfserver") {
            ToastMessage = "Killing server in the background";
        }
        toastr.success("", ToastMessage, { timeOut: 5000 });
    }
}

const ws = new WS();
module.exports = ws;
