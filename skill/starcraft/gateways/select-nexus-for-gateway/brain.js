
export default class Brain {

  react(input) {
    const baseX = input[0];
    const baseY = input[1];
    const nexus = input[2];
    const nexusPylons = input[3];
    const nexusGateways = input[4];
    const alternative = input[8] ? input[8] : input[5];
    const alternativeGateways = input[8] ? input[9] : input[6];

    if (!baseX || !baseY) {
      // This nexus doesn't have space for structures
      return;
    }

    if ((nexusPylons > nexusGateways) && (!alternative || (nexusGateways < alternativeGateways))) {
      return [1, nexus, nexusGateways];
    }
  }

}
