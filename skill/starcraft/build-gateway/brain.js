
export default class BuildGatewayBrain {

  react(input) {
    const nexusCount = input[0];
    const gatewayCount = input[1];
    const minerals = input[2];
    const foodUsed = input[3];
    const foodCap = input[4];

    if ((minerals > 150 + gatewayCount * 100) && (foodUsed < foodCap - 2)) {
      return [3, 883, 100, 100];
    }
  }

}
