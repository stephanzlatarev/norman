
export default class KnowWhenToBuildANexusBrain {

  react(input) {
    const minerals = input[0];
    const nexusCount = input[1];
    const pylonCount = input[2];

    if ((minerals >= 300) && (nexusCount <= pylonCount)) {
      return [1];
    }
  }

}
