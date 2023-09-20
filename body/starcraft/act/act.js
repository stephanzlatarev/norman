import chat from "./chat.js";
import commandUnits from "./units.js";
import commandWorkers from "./workers.js";

export default async function(model, client, units) {
  await chat(model.add("Chat"), client);
  await commandUnits(client, units.filter(unit => (unit.get("type").label !== "probe")));
  await commandWorkers(model, client, units.filter(unit => (unit.get("type").label === "probe")));
}
