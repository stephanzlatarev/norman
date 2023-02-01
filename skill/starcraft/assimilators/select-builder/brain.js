
export default class Brain {

  react(input) {
    const locationX = input[0];
    const locationY = input[1];
    const thisProbeBusy = input[2];
    const thisProbeX = input[3];
    const thisProbeY = input[4];

    if (thisProbeBusy) return;

    const selectedProbeX = input[6];
    const selectedProbeY = input[7];

    if (!selectedProbeX) {
      return [1, thisProbeX, thisProbeY];
    }

    const distanceThisProbe = distance(thisProbeX, thisProbeY, locationX, locationY);
    const distanceSelectedProbe = distance(selectedProbeX, selectedProbeY, locationX, locationY);

    if (distanceThisProbe < distanceSelectedProbe) {
      return [1, thisProbeX, thisProbeY];
    }
  }

}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
