
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

export function setupHarvest(node) {
  const probes = [];
  const minerals = [];
  let cluster;
  let nexus;

  for (const unit of node.links()) {
    const unitType = unit.get("unitType");

    if (unitType === "probe") {
      unit.x = unit.get("x");
      unit.y = unit.get("y");
      probes.push(unit);
    }

    if ((unitType === "nexus") && !minerals.length) {
      cluster = unit.get("resources");
      if (!cluster) return false;

      unit.x = unit.get("x");
      unit.y = unit.get("y");
      nexus = unit;

      cluster.x = cluster.get("x");
      cluster.y = cluster.get("y");

      for (const resource of cluster.links()) {
        if (resource.get("unitType") === "mineral") {
          resource.x = resource.get("x");
          resource.y = resource.get("y");
          minerals.push(resource);
        }
      }
    }
  }

  if (!nexus || !probes.length || !minerals.length) return false;
  if (minerals.length * 2 < probes.length) return false;

  cluster.a = angle(cluster.x - nexus.x, cluster.y - nexus.y);

  for (const probe of probes) {
    probe.x -= nexus.x;
    probe.y -= nexus.y;
    probe.a = normalize(angle(probe.x, probe.y) - cluster.a);
  }
  probes.sort((a, b) => (a.a - b.a));

  for (const mineral of minerals) {
    mineral.x -= nexus.x;
    mineral.y -= nexus.y;
    mineral.d = Math.sqrt(mineral.x * mineral.x + mineral.y * mineral.y);
    mineral.a = normalize(angle(mineral.x, mineral.y) - cluster.a);
  }
  minerals.sort((a, b) => (a.d - b.d));
  minerals.length = Math.floor(probes.length / 2);
  minerals.sort((a, b) => (a.a - b.a));

  for (let i = 0; i < minerals.length; i++) {
    probes[i * 2].set("harvest", minerals[i]);
    probes[i * 2 + 1].set("harvest", minerals[i]);
  }

  return true;
}

function angle(x, y) {
  let a = Math.atan(y / x) * 180 / Math.PI;
  if (x < 0) a += 180;
  if (a < 0) a += 360;
  return a;
}

function normalize(a) {
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  return a;
}
