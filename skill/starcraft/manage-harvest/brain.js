
export default class ManageHarvestBrain {

  react(input) {
    const minerals = input[0];
    const nexus = input[1];
    const countOfProbes = input[2];

    if ((minerals >= 50) && (countOfProbes < 80)) {
      return [nexus, 1006];
    }
  }

}
