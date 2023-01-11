
export default class Brain {

  react(input) {
    const directionX = input[0];
    const directionY = input[1];
    const alternativeX = input[2];
    const alternativeY = input[3];
    const builderX = input[4];
    const builderY = input[5];
    const nexusX = input[6];
    const nexusY = input[7];

    if (distance(directionX, directionY, nexusX, nexusY) > 50) {
      if (alternativeX && alternativeX) {
        if (builderX && builderY) {
          if (distance(directionX, directionY, builderX, builderY) < distance(alternativeX, alternativeY, builderX, builderY)) {
            return [1];
          }
        } else if (nexusX && nexusY) {
          if (distance(directionX, directionY, nexusX, nexusY) < distance(alternativeX, alternativeY, nexusX, nexusY)) {
            return [1];
          }
        }
      } else {
        return [1];
      }
    }
  }

}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
