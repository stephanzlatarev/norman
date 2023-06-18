import deployTroops from "./deploy.js";
import actWithChat from "./chat.js";
import actWithUnits from "./units.js";

export default async function(model, client, units) {
  await actWithChat(model.add("Chat"), client);
  await actWithUnits(model, client, units);
  await deployTroops(model, client);
}
