
export default class Brain {

  react(input) {
    const locationX = input[0];
    const locationY = input[1];
    let selectedProbe = input[2];

    if (selectedProbe) return;

    const thisProbeX = input[3];
    const thisProbeY = input[4];

    selectedProbe = input[6];
    const selectedProbeX = input[7];
    const selectedProbeY = input[8];

    if (!selectedProbe) {
      return [1, thisProbeX, thisProbeY];
    }

    const distanceThisProbe = distance(thisProbeX, thisProbeY, locationX, locationY);
    const distanceSelectedProbe = distance(selectedProbeX, selectedProbeY, locationX, locationY);

    if (distanceThisProbe < distanceSelectedProbe) {
      return [1, 1, thisProbeX, thisProbeY];
    }
  }

}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
