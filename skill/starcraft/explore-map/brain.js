
export default class ExploreMapBrain {

  react(input) {
    const mode = input[0];
    const zealot = input[1];
    const enemyBaseX = input[2];
    const enemyBaseY = input[3];

    if (mode === "explore") {
      if (Math.random() < 0.5) {
        // Check enemy base
        return [zealot, 16, enemyBaseX, enemyBaseY];
      } else {
        // Move around
        return [zealot, 16, 250 * Math.random(), 250 * Math.random()];
      }
    }
  }

}
