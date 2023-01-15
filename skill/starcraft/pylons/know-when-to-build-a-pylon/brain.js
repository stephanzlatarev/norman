
export default class Brain {

  react(input) {
    const minerals = input[0];
    const foodUsed = input[1];
    const nexusCount = input[2];
    const pylonCount = input[3];
    const foodThreshold = nexusCount * 15 + pylonCount * 8 - 5;

    if ((foodUsed >= foodThreshold) && (minerals >= 100)) {
      return [1, minerals - 100];
    } else {
      return [-1, minerals]
    }
  }

}
