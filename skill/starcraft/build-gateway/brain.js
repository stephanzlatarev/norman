
export default class BuildGatewayBrain {

  react(input) {
    const minerals = input[0];
    const foodUsed = input[1];
    const foodCap = input[2];

    if ((minerals > 150) && (foodUsed < foodCap - 2)) {
      return [3, 883, 100, 100];
    }
  }

}
