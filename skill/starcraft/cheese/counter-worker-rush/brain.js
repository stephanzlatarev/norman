
export default class Brain {

  react(input) {
    const enemyX = input[0] ? input[0] : input[2];
    const enemyY = input[1] ? input[1] : input[3];

    return [1, enemyX, enemyY];
  }

}
