
let distance;
let reaction;

let canUseSingleBaseStrategy = true;

let watchForZerglingRush = true;
let detectedZerglingRush = false;

export default class Brain {

  react(input) {
    const strategy = input[0];
    const homeX = input[1];
    const homeY = input[2];
    const nexuses = input[3];
    const warriors = input[4];
    const enemies = input[5] + input[8];
    const enemyX = input[6] ? input[6] : input[9];
    const enemyY = input[7] ? input[7] : input[10];

    const enemyZergling = input[10];
    const enemyHydralisk = input[11];
    const enemyRoach = input[12];
    const enemyQueen = input[13];

    if (enemies && reaction && near(enemyX, enemyY, homeX, homeY, distance)) {
      return reaction;
    }

    if (canUseSingleBaseStrategy && (nexuses === 1) && (enemies > 1)) {

      // Detect worker rush
      if (near(enemyX, enemyY, homeX, homeY, 20)) {
        // Set strategy to single-base (1) and raise goal to counter worker rush
        console.log("Detected worker rush");
        distance = 20;
        reaction = [1, 1, 1];
        return reaction;
      }

      // Detect first expansion challenged
      if ((enemies > warriors) && near(enemyX, enemyY, homeX, homeY, 40)) {
        // Set strategy to single-base (1)
        console.log("Detected first expansion challenged");
        distance = 40;
        reaction = [1, 1, -1];
        return reaction;
      }

    }

    if (watchForZerglingRush) {
      if (enemyHydralisk + enemyRoach + enemyQueen >= 2) {
        watchForZerglingRush = false;
      } else if (detectedZerglingRush || (enemyZergling >= 8)) {
        if (!detectedZerglingRush) console.log("Detected zergling rush");
        detectedZerglingRush = true;
        reaction = [1, 2];
        return reaction;
      }
    }

    reaction = null;

    if ((strategy === 1) || (strategy === 2)) {
      // Set strategy back to the standard (0) and remove any goals to counter cheese tactics
      console.log("Set strategy back to the standard");
      canUseSingleBaseStrategy = false;
      return [1, -1, -1];
    }

    return [1, 0, -1];
  }

}

function near(x1, y1, x2, y2, distance) {
  return (Math.abs(x1 - x2) <= distance) && (Math.abs(y1 - y2) <= distance);
}
