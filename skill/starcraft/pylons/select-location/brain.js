
const LOCATIONS = [
  { x: 1, y: 1 }, { x: 3, y: 1 },
  { x: 1, y: 3 }, { x: 3, y: 3 },
];

export default class Brain {

  react(input) {
    const powerNewBase = input[1] && (input[0] !== 1);
    const baseX = input[2];
    const baseY = input[3];
    const distance = input[4];
    const pylons = input[5];

    const selectedLocation = input[6];
    const distanceOfSelectedLocation = input[9];

    if ((powerNewBase && pylons) || (pylons >= LOCATIONS.length)) {
      // The base of this nexus is already full of pylons, or we need to power a new base
      return;
    }

    if (!selectedLocation || (distance < distanceOfSelectedLocation)) {
      const location = LOCATIONS[pylons];
      return [1, baseX + location.x, baseY + location.y, distance];
    }
  }

}
