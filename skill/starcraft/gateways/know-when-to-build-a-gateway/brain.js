
export default class Brain {

  react(input) {
    if (input[0]) {
      // A gateway is already building
      return [-1, input[1]];
    }

    const minerals = input[1];
    const nexusCount = input[2] + input[3];
    const pylonCount = input[4];
    const gatewayCount = input[5];

    if ((nexusCount > 1) && (gatewayCount < nexusCount * 2) && (gatewayCount < pylonCount) && (minerals >= 150)) {
      return [1, minerals - 150];
    } else {
      return [-1, minerals]
    }
  }

}
