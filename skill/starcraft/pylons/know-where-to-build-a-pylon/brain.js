
const LOCATIONS = [
  { x: -1, y: 3 }, { x: 1, y: 3 },
  { x: 3, y: 3 }, { x: -3, y: 3 },
  { x: 3, y: -3 }, { x: 1, y: -3 },
];

export default class Brain {

  react(input) {
    const x = input[0];
    const y = input[1];
    const pylons = input[2];

    if (pylons < LOCATIONS.length) {
      const location = LOCATIONS[pylons];

      return [1, x + location.x, y + location.y];
    }
  }

}
