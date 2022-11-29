
export default class ManageHarvestBrain {

  react(input) {
    const minerals = input[0];
    const nexus = input[1];
    const countOfProbes = input[2];
    const countOfIdleGateways = input[3];
    const countOfNexuses = input[4];
    const probesLimit = Math.min(countOfNexuses * 16 + 8, 80);

    if ((minerals >= 50) && (countOfProbes < probesLimit) && !countOfIdleGateways) {
      return [nexus, 1006];
    }
  }

}
