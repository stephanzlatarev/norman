
let reaction;

export default class Brain {

  react(input) {
    const homeX = input[0];
    const homeY = input[1];
    const nexuses = input[2];
    const enemies = input[3] + input[6];
    const enemyX = input[4] ? input[4] : input[7];
    const enemyY = input[5] ? input[5] : input[8];

    if (enemies && reaction) {
      return reaction;
    }

    if ((nexuses === 1) && (enemies > 1)) {

      // Detect worker rush
      if (near(enemyX, enemyY, homeX, homeY, 20)) {
        // Set strategy to single-base (1) and raise goal to counter worker rush
        reaction = [1, 1, 1];
        return reaction;
      }

      // Detect first expansion challenged
      if (near(enemyX, enemyY, homeX, homeY, 50)) {
        // Set strategy to single-base (1)
        reaction = [1, 1, -1];
        return reaction;
      }

    }

    // Keep strategy to standard (0) and remove any goals to counter cheese tactics
    reaction = null;
    return [1, -1, -1];
  }

}

function near(x1, y1, x2, y2, distance) {
  return (Math.abs(x1 - x2) <= distance) && (Math.abs(y1 - y2) <= distance);
}
