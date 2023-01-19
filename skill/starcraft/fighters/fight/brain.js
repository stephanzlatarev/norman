
export default class Brain {

  react(input) {
    const armyCount = input[0];
    const armyX = input[1];
    const armyY = input[2];
    const enemyCount = input[3];
    const enemyX = input[4];
    const enemyY = input[5];

    if ((armyCount <= enemyCount) && (armyCount < 12) && armyX && armyY) {
      // Rally army
      return [1, -1, armyX, armyY];
    } else if (enemyX && enemyY) {
      // Attack enemy
      return [-1, 1, enemyX, enemyY];
    }

    return [-1, -1];
  }

}
