
export default class Brain {

  react(input) {
    const locationX = input[0];
    const locationY = input[1];
    const alternativeX = input[9] ? input[10] : input[2];
    const alternativeY = input[9] ? input[11] : input[3];
    const enemyBaseX = input[4];
    const enemyBaseY = input[5];
    const thisScout = input[6];
    const otherScout = input[7];

    if (otherScout && (otherScout !== thisScout)) {
      // This location is already scouted
      return;
    }

    if (!alternativeX && !alternativeY) {
      return [1, locationX, locationY];
    } else if (distance(locationX, locationY, enemyBaseX, enemyBaseY) < distance(alternativeX, alternativeY, enemyBaseX, enemyBaseY)) {
      return [1, locationX, locationY];
    }
  }

}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
