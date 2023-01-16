
export default class Brain {

  react(input) {
    const armyCount = input[0];
    const armyX = input[1];
    const armyY = input[2];
    const enemyCount = input[3];
    const enemyX = input[4];
    const enemyY = input[5];

    if (enemyCount > 0) {
      if ((armyCount <= enemyCount) && (armyCount < 12)) {
        // Rally army
        return [1, -1, armyX, armyY];
      } else {
        // Attack enemy
        return [-1, 1, enemyX, enemyY];
      }
    }
  }

}
