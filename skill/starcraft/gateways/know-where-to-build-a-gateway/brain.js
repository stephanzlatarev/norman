
const LOCATIONS = [{ x: -1.5, y: 0.5 }, { x: 1.5, y: 0.5 }];

export default class Brain {

  react(input) {
    const x = input[0];
    const y = input[1];
    const gateways = input[2];

    if (gateways < LOCATIONS.length) {
      const location = LOCATIONS[gateways];

      return [1, x + location.x, y + location.y];
    }
  }

}
