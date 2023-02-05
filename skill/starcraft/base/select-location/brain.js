
const LOCATIONS = [
  { x: -1.5, y: -1.5 },
  { x: -1.5, y:  1.5 },
  { x:  1.5, y: -1.5 },
];

export default class Brain {

  react(input) {
    const baseX = input[0];
    const baseY = input[1];
    const baseDistance = input[2];
    const structures = input[3];

    const selectedLocation = input[4];
    const distanceAtSelectedLocation = input[7];

    if (structures >= LOCATIONS.length) {
      // This base is already full
      return;
    }

    if (!selectedLocation || (baseDistance < distanceAtSelectedLocation)) {
      const location = LOCATIONS[structures];
      return [1, baseX + location.x, baseY + location.y, baseDistance];
    }
  }

}
