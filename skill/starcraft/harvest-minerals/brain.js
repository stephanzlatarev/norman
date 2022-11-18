
export default class ManageHarvestBrain {

  react(input) {
    const mode = input[0];
    const idleProbe = input[1];
    const freeMineralField = input[2];

    if (mode !== "defend") {
      return [idleProbe, 298, freeMineralField];
    }
  }

}
