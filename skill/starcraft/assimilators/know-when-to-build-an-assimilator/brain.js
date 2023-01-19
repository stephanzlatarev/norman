
export default class Brain {

  react(input) {
    if (input[0]) {
      // An assimilator is already building
      return [-1, input[1]];
    }

    const minerals = input[1];

    if (minerals >= 75) {
      return [1, minerals - 75];
    }
  }

}
