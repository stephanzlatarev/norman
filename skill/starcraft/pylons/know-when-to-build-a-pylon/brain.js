
export default class Brain {

  react(input) {
    if (input[0]) {
      // A pylon is already building
      return [-1, input[1]];
    }

    const minerals = input[1];
    const foodUsed = input[2];
    const nexusCount = input[3];
    const pylonCount = input[4];
    const foodThreshold = nexusCount * 15 + pylonCount * 8 - 5;

    if ((minerals >= 100) && ((foodUsed >= foodThreshold) || (pylonCount < nexusCount * 2))) {
      return [1, minerals - 100];
    } else {
      return [-1, minerals]
    }
  }

}
