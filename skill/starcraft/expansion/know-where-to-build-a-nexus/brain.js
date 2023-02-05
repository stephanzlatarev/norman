
export default class Brain {

  react(input) {
    const isDirectionOccupied = input[0];

    if (isDirectionOccupied) return;

    const directionX = input[1];
    const directionY = input[2];
    const alternativeX = input[12] ? input[12] : input[3];
    const alternativeY = input[13] ? input[13] : input[4];
    const builderX = input[5];
    const builderY = input[6];
    const homebaseX = input[7];
    const homebaseY = input[8];

    if (alternativeX && alternativeX) {
      if (builderX && builderY) {
        if (distance(directionX, directionY, builderX, builderY) < distance(alternativeX, alternativeY, builderX, builderY)) {
          // Prefer the direction which is closer to the builder
          return [1, directionX, directionY];
        }
      } else if (homebaseX && homebaseY) {
        if (distance(directionX, directionY, homebaseX, homebaseY) < distance(alternativeX, alternativeY, homebaseX, homebaseY)) {
          // Prefer the direction which is closer to the homebase
          return [1, directionX, directionY];
        }
      }
    } else {
      return [1, directionX, directionY];
    }
  }

}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
