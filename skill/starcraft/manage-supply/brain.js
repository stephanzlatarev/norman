
export default class ManageSupplyBrain {

  react(input) {
    const minerals = input[0];
    const pylonCount = input[1];
    const foodUsed = input[2];

    if ((minerals >= 100) && (foodUsed > pylonCount * 8 + 10)) {
      return [2, 881, 100, 100];
    }
  }

}
