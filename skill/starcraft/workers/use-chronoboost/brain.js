
export default class Brain {

  react(input) {
    const nexusIsOperational = input[0];
    const nexusEnergy = input[1];

    // Add input[2]=<count of probes>. Use chronoboost on nexus only if count of probes < 16

    if (nexusIsOperational && (nexusEnergy >= 50)) {
      return [1, nexusEnergy - 50];
    }
  }

}
