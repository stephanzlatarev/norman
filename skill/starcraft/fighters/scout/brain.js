
export default class Brain {

  react(input) {
    const locationX = input[0];
    const locationY = input[1];
    const alternativeX = input[9] ? input[10] : input[2];
    const alternativeY = input[9] ? input[11] : input[3];
    const homebaseX = input[4];
    const homebaseY = input[5];
    const thisZealot = input[6];
    const partnerZealot = input[7];
    const enemyCount = input[8];

    if (enemyCount) {
      // There are enemies to be fought
      if ((locationX === alternativeX) && (locationY === alternativeY)) {
        return [-1, locationX, locationY];
      } else {
        return;
      }
    }

    if (partnerZealot && (partnerZealot !== thisZealot)) {
      // This location is already scouted
      return;
    }

    if (!alternativeX && !alternativeY) {
      return [1, locationX, locationY];
    } else if (distance(locationX, locationY, homebaseX, homebaseY) > distance(alternativeX, alternativeY, homebaseX, homebaseY)) {
      return [1, locationX, locationY];
    }
  }

}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
