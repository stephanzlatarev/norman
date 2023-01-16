
export default class Brain {

  react(input) {
    const nexusIsOperational = input[0];
    const nexusEnergy = input[1];
    const nexusGateways = input[2];

    if (nexusIsOperational && !nexusGateways && (nexusEnergy >= 50)) {
      return [1, nexusEnergy - 50];
    }
  }

}
