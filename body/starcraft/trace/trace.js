import Memory from "../../../code/memory.js";
import traceBattles from "./battles.js";
import traceBorders from "./borders.js";
import traceJobs from "./jobs.js";
import traceMemory from "./memory.js";
import tracePerimeter from "./perimeter.js";
import tracePins from "./pins.js";
import traceRoutes from "./routes.js";
import traceThreats from "./threats.js";
import traceZones from "./zones.js";

let initialized;

export default async function(client, chat) {
  if (!initialized) { initializeToggles(); initialized = true; }

  const text = [];
  const shapes = [];
  const toggles = updateToggles(chat);

  if (Memory.ShowZones) traceBorders(shapes);
  if (Memory.ShowPerimeter) tracePerimeter(shapes);
  if (Memory.ShowRoutes) traceRoutes(shapes);
  if (Memory.ShowAlerts) traceZones(shapes);
  if (Memory.ShowPins) tracePins(shapes);
  if (Memory.ShowBattles) traceBattles(shapes, text);
  if (Memory.ShowThreats) traceThreats(shapes);

  traceMemory(text);
  traceJobs(text);

  for (let row = 0; row < text.length; row++) text[row] = { text: text[row], virtualPos: { x: 0, y: row } };
  for (const shape of shapes) text.push({ text: JSON.stringify(shape) });
  for (const toggle of toggles) text.push({ text: JSON.stringify(toggle) });

  await client.debug({ debug: [{ draw: { text } }] });
}

function initializeToggles() {
  Memory.ShowZones = false;
  Memory.ShowPerimeter = false;
  Memory.ShowRoutes = false;
  Memory.ShowAlerts = true;
  Memory.ShowPins = true;
  Memory.ShowBattles = true;
  Memory.ShowThreats = true;
}

function updateToggles(messages) {
  for (const one of messages) {
    const split = one.message.split(" ");

    if (split[0] === "Toggle:") {
      const toggle = split[1];

      Memory[toggle] = !Memory[toggle];
    }
  }

  return [
    { toggle: "ShowZones", label: "&#x1F5FA;", description: "Show zones", on: !!Memory.ShowZones },
    { toggle: "ShowPerimeter", label: "&#x29BC;", description: "Show perimeter", on: !!Memory.ShowPerimeter },
    { toggle: "ShowRoutes", label: "&#x1F6E3;", description: "Show routes", on: !!Memory.ShowRoutes },
    { toggle: "ShowAlerts", label: "&#x26A0;", description: "Show routes", on: !!Memory.ShowAlerts },
    { toggle: "ShowPins", label: "&#x1F4CC;", description: "Show pins", on: !!Memory.ShowPins },
    { toggle: "ShowBattles", label: "&#x2694;", description: "Show battles", on: !!Memory.ShowBattles },
    { toggle: "ShowThreats", label: "&#x1F47B;", description: "Show threats", on: !!Memory.ShowThreats },
  ];
}
