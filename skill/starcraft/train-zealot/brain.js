
export default class TrainZealotBrain {

  react(input) {
    const gateway = input[0];
    const minerals = input[1];
    const foodUsed = input[2];
    const foodCap = input[3];

    if ((minerals >= 150) && (foodUsed < foodCap - 2)) {
      return [gateway, 916];
    }
  }

}
