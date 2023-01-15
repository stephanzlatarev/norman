
export function observeStructures(node, observation) {
  countPylonsOfNexuses(node, observation);
}

export function countPylonsOfNexuses(node, observation) {
  for (const nexus of node.links()) {
    if (nexus.get("unitType") === "nexus") {
      const x = nexus.get("x");
      const y = nexus.get("y");
      const pylons = observation.rawData.units.filter(pylon => (pylon.unitType === 60) && near(pylon, x, y));

      nexus.set("pylons", pylons.length);
    }
  }
}

function near(pylon, x, y) {
  return (Math.abs(pylon.pos.x - x) <= 5) && (Math.abs(pylon.pos.y - y) <= 5);
}
