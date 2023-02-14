
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

    if ((strategy === 1) && (distance > 20)) {
      // This strategy doesn't allow to power a base in an expansion location
      return;
    }

    const location = LOCATIONS[pylons];

    if (!selectedLocation) {
      // This base is our first choice
      return [1, baseX + location.x, baseY + location.y, distance, pylons];
    }

    if (powerNewBase) {
      // We need to power a new base

      if (!pylons) {
        // This is an unpowered base

        if (pylonsOfSelectedLocation) {
          // This base is our first choice for an unpowered base
          return [1, baseX + location.x, baseY + location.y, distance, pylons];
        } else if (distance < distanceOfSelectedLocation) {
          // We prefer this one because it is closer than the alternative unpowered base
          return [1, baseX + location.x, baseY + location.y, distance, pylons];
        }
      } else {
        // This is a powered base. We may choose it only if there are no unpowered alternatives

        if (pylonsOfSelectedLocation && (distance < distanceOfSelectedLocation)) {
          // We choose this one because it is closer than the alternative powered base
          return [1, baseX + location.x, baseY + location.y, distance, pylons];
        }
      }
    } else {
      // Only distance matters

      if (distance < distanceOfSelectedLocation) {
        // We prefer bases which are closer to the home base
        return [1, baseX + location.x, baseY + location.y, distance, pylons];
      }
    }
  }

}
