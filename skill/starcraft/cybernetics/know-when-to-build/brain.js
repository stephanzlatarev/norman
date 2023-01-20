
export default class Brain {

  react(input) {
    if (input[3]) {
      // One is already being built
      return [-1, input[0]];
    }

    const minerals = input[0];
    const gateways = input[1];
    const cybernetics = input[2] + input[3];

    if (gateways && (cybernetics < 1) && (minerals >= 200)) {
      return [1, minerals - 200];
    } else {
      return [-1, minerals];
    }
  }

}
