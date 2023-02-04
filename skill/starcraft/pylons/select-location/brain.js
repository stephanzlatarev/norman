
const LOCATIONS = [
  { x: 0, y: 1 }, { x: 0, y: -1 },
  { x: 0, y: -3 }, { x: 0, y: 3 },
  { x: 2, y: 0 }, { x: -2, y: 0 },
];

export default class Brain {

  react(input) {
    const baseX = input[0];
    const baseY = input[1];
    const pylons = input[2];

    const selectedLocation = input[3];
    const pylonsAtSelectedLocation = input[6];

    if (!baseX || !baseY) {
      // This nexus has no base for structures
      return;
    }

    if (pylons >= LOCATIONS.length) {
      // The base of this nexus is already full of pylons
      return;
    }

    if (!selectedLocation || (pylons < pylonsAtSelectedLocation)) {
      const location = LOCATIONS[pylons];
      return [1, baseX + location.x, baseY + location.y, pylons];
    }
  }

}
