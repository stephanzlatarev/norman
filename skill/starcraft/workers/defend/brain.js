
export default class Brain {

  react(input) {
    const enemyX = input[0];
    const enemyY = input[1];

    return [1, enemyX, enemyY];
  }

}
