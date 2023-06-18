import chat from "./chat.js";
import deployTroops from "./deploy.js";
import commandFights from "./fight.js";
import commandUnits from "./units.js";
import commandWorkers from "./workers.js";

export default async function(model, client, units) {
  await chat(model.add("Chat"), client);

  await commandUnits(client, units.filter(unit => (unit.get("type").label !== "probe")));
  await commandWorkers(model, client, units.filter(unit => (unit.get("type").label === "probe")));

  await deployTroops(model, client);
  await commandFights(model, client);
}
