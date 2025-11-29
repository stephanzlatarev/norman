import Scan from "./scan.js";
import { Depot } from "./imports.js";

// Order inner zones by traversing from our home base outwards
// connecting all zones that have our buildings into one continous area.
export default function() {
  const total = new Set([...Scan.inner.depots, ...Scan.inner.production]);

  if (!total.size) return [];

  const home = total.has(Depot.home) ? Depot.home : total.values().next().value;
  const covered = new Set([home]);
  const traversed = new Set([home]);
  const paths = new Map();

  let wave = new Set([home]);

  paths.set(home, new Set());

  while (wave.size && (covered.size < total.size)) {
    const next = new Set();

    for (const zone of wave) traversed.add(zone);

    for (const zone of wave) {
      const root = paths.get(zone);

      for (const [neighbor, corridor] of zone.exits) {
        if (!corridor.via.isPassage) continue;
        if (traversed.has(neighbor)) continue;

        const path = paths.get(neighbor);
        const withCorridor = (corridor.via !== neighbor);

        if (path) {
          const length = withCorridor ? root.length + 2 : root.length + 1;

          if (path.length === length) {
            for (let i = 0; i < root.length; i++) path[i].add(...root[i]);
            if (withCorridor) path[root.length + 1].add(corridor.via);
            path[root.length].add(zone);
          }
        } else {
          if (withCorridor) {
            paths.set(neighbor, [...root, new Set([corridor.via]), new Set([zone])]);
          } else {
            paths.set(neighbor, [...root, new Set([zone])]);
          }
        }

        next.add(neighbor);

        if (total.has(neighbor)) covered.add(neighbor);
      }
    }

    wave = next;
  }

  // Sort the paths by length
  const lines = [];
  let maxlength = 0;
  for (const zone of total) {
    const line = [...paths.get(zone), new Set([zone])];
    lines.push(line);

    if (line.length > maxlength) maxlength = line.length;
  }
  lines.sort((a, b) => a.length - b.length);

  // List the zones in the lines by waves
  const list = [];
  const done = new Set();
  for (let i = 0; i < maxlength; i++) {
    for (const line of lines) {
      const wave = line[i];

      if (!wave) continue;

      for (const zone of wave) {
        if (!done.has(zone)) {
          list.push(zone);
          done.add(zone);
        }
      }
    }
  }

  return list;
}
