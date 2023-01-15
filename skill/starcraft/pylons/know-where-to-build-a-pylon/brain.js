
const LOCATIONS = {

  // Data-C map
  "34.5 58.5": [{ x: 3.5, y: 0.5 }, { x: 5.5, y: 0.5 }, { x: 7.5, y: 0.5 }, { x: 1.5, y: 3.5 }, { x: -0.5, y: 3.5 }, { x: -2.5, y: 3.5 }],
  "48.5 34.5": [{ x: 3.5, y: 0.5 }, { x: 5.5, y: 0.5 }, { x: 7.5, y: 0.5 }, { x: 1.5, y: 3.5 }, { x: -0.5, y: 3.5 }, { x: -2.5, y: 3.5 }],
  "61.5 58.5": [{ x: 3.5, y: 0.5 }, { x: 5.5, y: 0.5 }, { x: 7.5, y: 0.5 }, { x: 1.5, y: 3.5 }, { x: -0.5, y: 3.5 }, { x: -2.5, y: 3.5 }],
  "157.5 97.5": [{ x: -3.5, y: -0.5 }, { x: -5.5, y: -0.5 }, { x: -7.5, y: -0.5 }, { x: -1.5, y: -3.5 }, { x: 0.5, y: -3.5 }, { x: 2.5, y: -3.5 }],
  "143.5 121.5": [{ x: -3.5, y: -0.5 }, { x: -5.5, y: -0.5 }, { x: -7.5, y: -0.5 }, { x: -1.5, y: -3.5 }, { x: 0.5, y: -3.5 }, { x: 2.5, y: -3.5 }],
  "130.5 97.5": [{ x: -3.5, y: -0.5 }, { x: -5.5, y: -0.5 }, { x: -7.5, y: -0.5 }, { x: -1.5, y: -3.5 }, { x: 0.5, y: -3.5 }, { x: 2.5, y: -3.5 }],

};

export default class Brain {

  react(input) {
    const x = input[0];
    const y = input[1];
    const pylons = input[2];

    const key = x + " " + y;

    if (LOCATIONS[key] && LOCATIONS[key][pylons]) {
      const location = LOCATIONS[key][pylons];

      return [1, x + location.x, y + location.y];
    }
  }

}
