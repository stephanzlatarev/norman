
const LOCATIONS = [
  { x: -1.5, y:  0.5 },
  { x:  1.5, y:  0.5 },
  { x: -1.5, y: -2.5 },
];

export default class Brain {

  react(input) {
    const baseX = input[0];
    const baseY = input[1];
    const pylons = input[2];
    const structures = input[3];

    const selectedLocation = input[4];
    const structuresAtSelectedLocation = input[7];

    if (!baseX || !baseY) {
      // This nexus has no base for structures
      return;
    }

    if (!pylons) {
      // The base of this nexus is not powered yet
      return;
    }

    if (structures >= LOCATIONS.length) {
      // The base of this nexus is already full
      return;
    }

    if (!selectedLocation || (structures < structuresAtSelectedLocation)) {
      const location = LOCATIONS[structures];
      return [1, baseX + location.x, baseY + location.y, structures];
    }
  }

}
