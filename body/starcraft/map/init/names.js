
const NAME_SUFFIX = "αβγδ";

export function initNames(clusters) {
  const types = {
    A: new Map(), // Air
    D: new Map(), // Depot
    G: new Map(), // Ground
    R: new Map(), // Ramp
  };

  for (const cluster of clusters) {
    if (!cluster.center) continue;

    cluster.name = cluster.center.sector.name;

    let groups;
    if (cluster.isAir) {
      groups = types.A;
    } else if (cluster.isDepot) {
      groups = types.D;
    } else if (cluster.isGround) {
      groups = types.G;
    } else if (cluster.isRamp) {
      groups = types.R;
    } else {
      continue;
    }

    let group = groups.get(cluster.name);

    if (!group) {
      group = [];
      groups.set(cluster.name, group);
    }

    group.push(cluster);
  }

  for (const type of Object.keys(types)) {
    for (const [name, group] of types[type]) {
      if (group.length > 1) {
        group.sort((a, b) => (a.y * 1000 + a.x) - (b.y * 1000 + b.x));

        for (let i = 0; i < group.length; i++) {
          group[i].name = name + type + NAME_SUFFIX[i];
        }
      } else {
        group[0].name = name + type;
      }
    }
  }
}
