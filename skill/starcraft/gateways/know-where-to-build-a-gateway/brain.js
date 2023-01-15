
const LOCATIONS = {

  // Data-C map
  "34.5 58.5": [{ x: 5, y: -2 }, { x: 5, y: 3 }],
  "48.5 34.5": [{ x: 5, y: -2 }, { x: 5, y: 3 }],
  "61.5 58.5": [{ x: 5, y: -2 }, { x: 5, y: 3 }],
  "157.5 97.5": [{ x: -5, y: 2 }, { x: -5, y: -3 }],
  "143.5 121.5": [{ x: -5, y: 2 }, { x: -5, y: -3 }],
  "130.5 97.5": [{ x: -5, y: 2 }, { x: -5, y: -3 }],

};

export default class Brain {

  react(input) {
    const x = input[0];
    const y = input[1];
    const gateways = input[2];

    const key = x + " " + y;

    if (LOCATIONS[key] && LOCATIONS[key][gateways]) {
      const location = LOCATIONS[x + " " + y][gateways];

      return [1, x + location.x, y + location.y];
    }
  }

}
