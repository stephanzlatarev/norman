
const LOCATIONS = [
  { x: 2, y: 0 }, { x: -2, y: 0 },
  { x: 0, y: 3 }, { x: 0, y: 1 },
  { x: 0, y: -1 }, { x: 0, y: -3 },
];

export default class Brain {

  react(input) {
    const nexusX = input[0];
    const nexusY = input[1];
    const baseX = input[2];
    const baseY = input[3];
    const pylons = input[4];

    const selectedLocation = input[5];
    const pylonsAtSelectedLocation = input[8];

    if (!baseX || !baseY) {
      // This nexus has no base for structures
      return;
    }

    if (pylons >= LOCATIONS.length) {
      // The base of this nexus is already full of pylons
      return;
    }

    if (!selectedLocation || (pylons < pylonsAtSelectedLocation)) {
      const point = location(nexusX, nexusY, baseX, baseY, pylons);
      return [1, point.x, point.y, pylons];
    }
  }

}

// Build pylons in order from nexus away to other side of base
function location(nexusX, nexusY, baseX, baseY, pylons) {
  const location = LOCATIONS[pylons];
  const point = { x: 0, y: 0 };

  if (Math.abs(nexusY - baseY) >= Math.abs(nexusX - baseX)) {
    if (nexusY >= baseY) {
      // Nexus is above base
      point.x = baseX + location.x;
      point.y = baseY + location.y;
    } else {
      // Nexus is below base
      point.x = baseX + location.x;
      point.y = baseY - location.y;
    }
  } else {
    if (nexusX >= baseX) {
      // Nexus is right of base
      point.x = baseX + location.y;
      point.y = baseY + location.x;
    } else {
      // Nexus is left of base
      point.x = baseX - location.y;
      point.y = baseY + location.x;
    }
  }

  return point;
}
