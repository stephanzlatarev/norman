
export default class Brain {

  react(locationX, locationY, thisProbeX, thisProbeY, distanceSelectedProbe) {
    const distanceThisProbe = distance(thisProbeX, thisProbeY, locationX, locationY);

    if (!distanceSelectedProbe) {
      return [1, 1, 1, 0, distanceThisProbe];
    } else if (distanceThisProbe < distanceSelectedProbe) {
      return [1, 1, 1, 0, distanceThisProbe];
    }
  }

}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
