
export default class Brain {

  react(distanceThisMinerals, locationX, locationY, thisProbeX, thisProbeY, distanceSelectedMinerals, distanceSelectedProbe) {
    const distanceThisProbe = distance(thisProbeX, thisProbeY, locationX, locationY);

    if (!distanceSelectedMinerals && !distanceSelectedProbe) {
      // This is the first option
      return [1, distanceThisMinerals, distanceThisProbe];
    } else if (distanceThisMinerals < distanceSelectedMinerals) {
      // We prefer mineral fields which are closer to the nexus
      return [1, distanceThisMinerals, distanceThisProbe];
    } else if (distanceThisProbe < distanceSelectedProbe) {
      // We prefer probes which are closer to the mineral field
      return [1, distanceThisMinerals, distanceThisProbe];
    }
  }

}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
