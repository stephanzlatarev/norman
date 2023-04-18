
export async function goHarvest(unit, client) {
  const pending = unit.get("pending");
  if (pending) return;

  const harvest = unit.get("harvest");
  if (harvest) {
    const orders = unit.get("orders");
    const currentAbilityId = (orders && orders.length) ? orders[0].abilityId : -1;
    const currentTargetUnitTag = (orders && orders.length) ? orders[0].targetUnitTag : -1;
    const commandTargetUnitTag = harvest.get("tag");

    if ((currentAbilityId === -1) || ((currentAbilityId === 298) && (currentTargetUnitTag !== commandTargetUnitTag))) {
      // Command the probe to harvest this mineral field
      const command = { unitTags: [unit.get("tag")], abilityId: 298, targetUnitTag: commandTargetUnitTag, queueCommand: false };
      const response = await client.action({ actions: [{ actionRaw: { unitCommand: command } }] });
      if (response.result[0] !== 1) console.log(JSON.stringify(command), ">>", JSON.stringify(response));
    }
  }
}
