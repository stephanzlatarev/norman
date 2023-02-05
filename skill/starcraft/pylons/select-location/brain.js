
const LOCATIONS = [
  { x: 1, y: 1 }, { x: 3, y: 1 },
  { x: 1, y: 3 }, { x: 3, y: 3 },
];

export default class Brain {

  react(input) {
    const powerNewBase = input[0];
    const baseX = input[1];
    const baseY = input[2];
    const distance = input[3];
    const pylons = input[4];

    const selectedLocation = input[5];
    const distanceOfSelectedLocation = input[8];

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
