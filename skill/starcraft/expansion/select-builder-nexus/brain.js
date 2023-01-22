
export default class Brain {

  react(input) {
    const directionX = input[0];
    const directionY = input[1];
    const builderProbe = input[2];
    const thisProbeBusy = input[3];
    const thisProbeX = input[4];
    const thisProbeY = input[5];

    if (builderProbe || thisProbeBusy) return;

    const selectedProbeX = input[7];
    const selectedProbeY = input[8];

    if (!selectedProbeX || (distance(thisProbeX, thisProbeY, directionX, directionY) < distance(selectedProbeX, selectedProbeY, directionX, directionY))) {
      return [1, thisProbeX, thisProbeY];
    }
  }

}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
