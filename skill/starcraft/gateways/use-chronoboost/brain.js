
export default class Brain {

  react(input) {
    const nexusIsOperational = input[0];
    const nexusEnergy = input[1];
    const nexusGateway = input[2];

    if (nexusIsOperational && nexusGateway && (nexusEnergy >= 50)) {
      return [1, nexusEnergy - 50];
    }
  }

}
