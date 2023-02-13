
const LOCATIONS = [
  { x: 1, y: 1 }, { x: 3, y: 1 },
  { x: 1, y: 3 }, { x: 3, y: 3 },
];

export default class Brain {

  react(input) {
    const strategy = input[0];
    const powerNewBase = input[1];
    const baseX = input[2];
    const baseY = input[3];
    const distance = input[4];
    const pylons = input[5];

    const selectedLocation = input[6];
    const distanceOfSelectedLocation = input[9];
    const pylonsOfSelectedLocation = input[10];

    if (pylons >= LOCATIONS.length) {
      // This base is already full of pylons
      return;
    }

    if ((strategy === 1) && (distance > 15)) {
      // This strategy doesn't allow to power a base in an expansion location
      return;
    }

    const location = LOCATIONS[pylons];

    if (!selectedLocation) {
      // This base is our first choice
      return [1, baseX + location.x, baseY + location.y, distance, pylons];
    }

    if (powerNewBase && !pylons && (pylonsOfSelectedLocation || (distance < distanceOfSelectedLocation))) {
      // We need to power a new base. We prefer this one because it has no pylons and is closer than the alternatives
      return [1, baseX + location.x, baseY + location.y, distance, pylons];
    }

    if (distance < distanceOfSelectedLocation) {
      // We prefer bases which are closer to the home base
      return [1, baseX + location.x, baseY + location.y, distance, pylons];
    }
  }

}
