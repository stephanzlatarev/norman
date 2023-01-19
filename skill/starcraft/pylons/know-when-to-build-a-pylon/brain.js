
export default class Brain {

  react(input) {
    if (input[0]) {
      // A pylon is already building
      return [-1, input[1]];
    }

    const minerals = input[1];
    const foodUsed = input[2];
    const nexusCount = input[3];
    const nexusBuilding = input[4];
    const gatewayCount = input[5];
    const gatewayBuilding = input[6];
    const pylonCount = input[7];
    const foodThreshold = nexusCount * 15 + pylonCount * 8 - 10;

    if (pylonCount && ((nexusCount + nexusBuilding < 2) || (gatewayCount + gatewayBuilding < 1))) {
      // Don't build a second pylon before the second nexus and first gateway are started
      return;
    }

    if (pylonCount >= ((nexusCount + nexusBuilding) * 6)) {
      // Too many pylons
      return;
    }

    if ((minerals >= 100) && (foodUsed >= foodThreshold)) {
      return [1, minerals - 100];
    }
  }

}
