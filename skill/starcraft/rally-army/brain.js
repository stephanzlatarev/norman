
export default class RallyArmyBrain {

  react(input) {
    const mode = input[0];
    const zealot = input[1];
    const rallyX = input[2];
    const rallyY = input[3];
    const enemyX = input[4];
    const enemyY = input[5];

    if (mode === "attack") {
      // Attack enemy
      return [zealot, 3674, enemyX, enemyY];
    } else if (mode === "rally") {
      // Move to rally point
      return [zealot, 16, rallyX, rallyY];
    }
  }

}
