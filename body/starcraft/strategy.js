
const FACTORIES = {
  59: "nexus",
  62: "gateway",
  63: "forge",
  67: "stargate",
  71: "robotics",
  72: "cybernetics",
};

export async function applyStrategy(node, client, observation) {
  const strategy = node.get("strategy");

  if (strategy === 4) {
    const units = observation.ownUnits;
    for (const unit of units) {
      if ((unit.buildProgress < 1) && (unit.unitType !== 60)) {
        // This is not a pylon and is currently being built
        await cancel(client, unit, 3659);
      }

      if (unit.orders.length && FACTORIES[unit.unitType] && (unit.orders[0].abilityId !== 916) && (unit.orders[0].abilityId !== 917)) {
        // This is building something other than a zealot or a stalker
        await cancel(client, unit, 3671);
      }
    }
    
  }
}

async function cancel(client, unit, op) {
  await client.action({ actions: [{ actionRaw: { unitCommand: { unitTags: [unit.tag], abilityId: op } } }] });
  
}
