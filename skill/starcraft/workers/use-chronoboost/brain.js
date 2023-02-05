
export default class Brain {

  react(input) {
    const nexusIsOperational = input[0];
    const nexusEnergy = input[1];

    if (nexusIsOperational && (nexusEnergy >= 50)) {
      return [1, nexusEnergy - 50];
    }
  }

}
