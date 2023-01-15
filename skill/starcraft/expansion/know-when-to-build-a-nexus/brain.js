
export default class Brain {

  react(input) {
    if (input[0]) {
      // A nexus is already building
      return [-1];
    }

    const minerals = input[1];
    const nexusCount = input[2];
    const pylonCount = input[3];

    if ((minerals >= 300) && (nexusCount <= pylonCount)) {
      return [1];
    }
  }

}
