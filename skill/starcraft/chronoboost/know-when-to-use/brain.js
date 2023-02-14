
export default class Brain {

  react(input) {
    const nexus = input[0];
    const nexusIsOperational = input[1];
    const nexusEnergy = input[2];
    const alternativeNexus = input[3];

    if (alternativeNexus && (alternativeNexus !== nexus)) {
      // We're preparing to use chronoboost from another nexus
      return;
    }

    if (nexusIsOperational && (nexusEnergy >= 50)) {
      return [1, 1, 0];
    }

    return [-1, -1, -1];
  }

}
