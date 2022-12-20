
export default class KnowWhenToBuildAPylonBrain {

  react(input) {
    const foodUsed = input[0];
    const foodCap = input[1];
    const minerals = input[2];

    if ((foodUsed > foodCap - 10) && (minerals >= 100)) {
      return [1, minerals - 100];
    }
  }

}
