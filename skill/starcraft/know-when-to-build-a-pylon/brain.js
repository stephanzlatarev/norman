
export default class KnowWhenToBuildAPylonBrain {

  react(input) {
    const foodUsed = input[0];
    const pylonCount = input[1];
    const minerals = input[2];
    const foodThreshold = pylonCount * 8 + 8;

    if ((foodUsed >= foodThreshold) && (minerals >= 100)) {
      return [1, minerals - 100];
    } else {
      return [-1, minerals]
    }
  }

}
