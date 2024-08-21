const AgentMap = require("./agentmap");

window.agentMap = new AgentMap(window.agent);

function main() {
    window.agentMap.SetUpMap();
}

$(document).ready(() => {
    main();
});
