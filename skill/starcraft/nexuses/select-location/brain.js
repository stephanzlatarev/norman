
export default class Brain {

  react(input) {
    const isDirectionOccupied = input[0];

    if (isDirectionOccupied) return;

    const directionX = input[1];
    const directionY = input[2];
    const homebaseX = input[3];
    const homebaseY = input[4];
    const directionNexusX = input[5];
    const directionNexusY = input[6];

    const directionDistance = distance(directionX, directionY, homebaseX, homebaseY);

    const selectedDirection = input[7];
    const selectedDirectionDistance = input[10];

    if (!selectedDirection || (directionDistance < selectedDirectionDistance)) {
      return [1, directionNexusX, directionNexusY, directionDistance];
    }
  }

}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
