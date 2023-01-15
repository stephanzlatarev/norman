
export default class Brain {

  react(input) {
    const minerals = input[0];
    const nexusCount = input[1];
    const pylonCount = input[2];
    const gatewayCount = input[3];

    if ((nexusCount > 1) && (gatewayCount < nexusCount * 2) && (gatewayCount < pylonCount) && (minerals >= 150)) {
      return [1, minerals - 150];
    } else {
      return [-1, minerals]
    }
  }

}
