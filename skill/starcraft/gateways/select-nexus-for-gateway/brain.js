
export default class Brain {

  react(input) {
    const nexus = input[0];
    const nexusPylons = input[1];
    const nexusGateways = input[2];
    const alternative = input[6] ? input[6] : input[3];
    const alternativeGateways = input[6] ? input[7] : input[4];

    if ((nexusPylons > nexusGateways) && (!alternative || (nexusGateways < alternativeGateways))) {
      return [1, nexus, nexusGateways];
    }
  }

}
