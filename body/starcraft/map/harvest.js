
export function mapClusterResources(model, cluster) {
  if (!cluster) return false;
  if (cluster.isMapped) return true;

  const RESOURCE = model.add("resource");

  for (const resource of cluster.resources) {
    const tag = findTag(model.observation.rawData.units, resource.tag, resource.x, resource.y);

    if (tag) {
      resource.tag = tag;
    } else {
      return false;
    }
  }

  for (const resource of cluster.resources) {
    model.add(resource.tag).set("tag", Number(resource.tag))
      .set("class", RESOURCE).set("type", model.add(resource.type)).set("harvested", false)
      .set("isLocation", true).set("x", resource.x).set("y", resource.y)
      .set("distanceToNexus", resource.d);
  }

  cluster.isMapped = true;
  return true;
}

export function mapHarvest(model, nexus, cluster) {
  const probes = model.memory.all({ "type:probe": true });
  const minerals = model.memory.all({ type: "mineral" });

  if (!probes.length || !minerals.length) return false;

  for (const probe of probes) {
    probe.x = probe.get("x");
    probe.y = probe.get("y");
  }

  nexus.x = nexus.get("x");
  nexus.y = nexus.get("y");

  for (const mineral of minerals) {
    mineral.x = mineral.get("x");
    mineral.y = mineral.get("y");
  }

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
    minerals[i].set("harvested", true);
    minerals[i].set("isUtilized", true);
    probes[i * 2].set("harvest", minerals[i]);
    probes[i * 2 + 1].set("harvest", minerals[i]);
  }

  watchHarvest(model);
}

function watchHarvest(model) {
  const utilizedMinerals = {};
  const harvesters = model.memory.pattern({
    nodes: { PROBE: { "type:probe": true }, MINERALS: { type: "mineral" } },
    paths: [ [ "PROBE", "harvest", "MINERALS" ] ],
    infos: [ { node: "PROBE" } ]
  });
  const assimilators = model.memory.pattern({
    nodes: { PROBE: { "type:probe": true }, ASSIMILATOR: { "type:assimilator": true } },
    paths: [ [ "PROBE", "harvest", "ASSIMILATOR" ] ],
    infos: [ { node: "PROBE" } ]
  });

  harvesters.listen(function() {
    for (const match of harvesters) {
      const minerals = match.node("MINERALS");
      const probe = match.node("PROBE");
      let harvester1 = minerals.get("harvester-1");
      let harvester2 = minerals.get("harvester-2");

      if ((probe === harvester1) || (probe === harvester2)) continue;

      if (!harvester1) {
        minerals.set("harvester-1", probe);
        harvester1 = probe;
      } else if (!minerals.get("harvester-2")) {
        minerals.set("harvester-2", probe);
        harvester2 = probe;
      }

      if (harvester1 && harvester2) {
        minerals.set("isUtilized", true);
        utilizedMinerals[minerals.ref] = minerals;
      }

      minerals.set("harvested", true);
    }
  });

  assimilators.listen(function() {
    for (const ref in utilizedMinerals) {
      const minerals = utilizedMinerals[ref];

      const harvester1 = minerals.get("harvester-1");
      if (!harvester1 || (harvester1.get("harvest") !== minerals)) {
        minerals.set("harvester-1", false);
        minerals.set("isUtilized", false);
        delete utilizedMinerals[ref];
      }

      const harvester2 = minerals.get("harvester-2");
      if (!harvester2 || (harvester2.get("harvest") !== minerals)) {
        minerals.set("harvester-2", false);
        minerals.set("isUtilized", false);
        delete utilizedMinerals[ref];
      }
    }
  });
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

function findTag(units, tag, x, y) {
  let resource = units.find(unit => (unit.tag === tag));

  if (resource) {
    return (resource.mineralContents + resource.vespeneContents > 0) ? resource.tag : null;
  }

  resource = units.find(unit => ((unit.pos.x === x) && (unit.pos.y === y)));

  if (resource) {
    return (resource.mineralContents + resource.vespeneContents > 0) ? resource.tag : null;
  }
}
