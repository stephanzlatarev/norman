
// Recalculate outer perimeter levels by traversing from inner to enemy perimeter
export default function(inner, enemy) {
  const list = [];
  const traversed = new Set([...inner, ...enemy]);

  let wave = new Set(inner);

  while (wave.size) {
    const next = new Set();

    for (const zone of wave) {
      for (const [neighbor, corridor] of zone.exits) {
        if (!corridor.via.isPassage) continue;
        if (traversed.has(neighbor)) continue;

        next.add(neighbor);
        traversed.add(neighbor);
      }
    }

    wave = next;

    const ordered = listByDistance(wave, enemy);
    for (const zone of ordered) list.push(zone);
  }

  return list;
}

function listByDistance(zones, enemy) {
  return [...zones]
    .map(zone => ({ zone, distance: calculateTotalDistance(zone, enemy) }))
    .sort((a, b) => (b.distance - a.distance))
    .map(item => item.zone);
}

function calculateTotalDistance(zone, enemy) {
  let sum = 0;

  for (const one of enemy) {
    sum += calculateDistance(zone, one);
  }

  return sum;
}

function calculateDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(dx * dx + dy * dy);
}
