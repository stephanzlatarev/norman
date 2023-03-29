
let distance;
let reaction;
let confirmation;

let confirmationRequiresVisibleEnemies;

let canUseSingleBaseStrategy = true;

let detectedFirstExpansionChallenged = false;

let watchForZerglingRush = true;
let detectedZerglingRush = false;

let watchForQueenRush = true;
let detectedQueenRush = false;

let watchForReaperRush = true;
let detectedReaperRush = false;

const GAME_OPENING = 4 * 60 * 22.4;
let tick = 0;

export default class Brain {

  react(input) {
    tick++;
    if (tick > GAME_OPENING) canUseSingleBaseStrategy = false;

    const strategy = input[0];
    const homeX = input[1];
    const homeY = input[2];
    const nexuses = input[3];
    const warriors = input[4];
    const enemies = input[5] + input[8];
    const enemyX = input[6] ? input[6] : input[9];
    const enemyY = input[7] ? input[7] : input[10];

    const enemyZergling = input[11];
    const enemyHydralisk = input[12];
    const enemyRoach = input[13];
    const enemyQueen = input[14];

    const enemyWarriorWorkers = input[15];
    const enemyVisibleCount = input[16];

    const enemyMarine = input[17];
    const enemyReaper = input[18];
    const enemyBunker = input[19];

    if (watchForZerglingRush) {
      if (enemyHydralisk + enemyRoach + enemyQueen >= 2) {
        watchForZerglingRush = false;
        detectedZerglingRush = false;
      } else if (detectedZerglingRush || (enemyZergling >= 4)) {
        if (!detectedZerglingRush) console.log("Detected zergling rush");
        detectedZerglingRush = true;
        reaction = null;
        return [1, 2, -1, -1];
      }
    }

    if (watchForQueenRush) {
      if (enemyZergling + enemyRoach + enemyHydralisk >= 1) {
        watchForQueenRush = false;
        detectedQueenRush = false;
      } else if (detectedQueenRush || (enemyQueen >= 2)) {
        if (!detectedQueenRush) console.log("Detected queen rush");
        detectedQueenRush = true;
        reaction = null;
        return [1, 5, -1, -1];
      }
    }

    if (watchForReaperRush) {
      if ((enemyMarine >= 1) || (enemyBunker >= 1)) {
        watchForReaperRush = false;
        detectedReaperRush = false;
      } else if (detectedReaperRush || (enemyReaper >= 1)) {
        if (!detectedReaperRush) console.log("Detected reaper rush");
        detectedReaperRush = true;
        reaction = null;
        return [1, 3, -1, -1];
      }
    }

    if (detectedFirstExpansionChallenged && (enemyWarriorWorkers > 2)) {
      // Change to warrior worker rush
      detectedFirstExpansionChallenged = false;
      reaction = null;
    }

    if (reaction) {
      if ((enemyVisibleCount || !confirmationRequiresVisibleEnemies) && near(enemyX, enemyY, homeX, homeY, distance)) {
        if (confirmationRequiresVisibleEnemies) confirmation = 3 * 22.4; // 3 seconds confirmation
        return reaction;
      } else if (confirmation > 0) {
        confirmation--;
        return reaction;
      }
    }

    if (canUseSingleBaseStrategy && (nexuses === 1) && enemyVisibleCount && (enemies > 1)) {

      // Detect worker rush
      if (near(enemyX, enemyY, homeX, homeY, 20)) {
        // Set strategy to single-base (1) and raise goal to counter worker rush
        console.log("Detected worker rush");
        distance = 30;
        reaction = [1, 1, 1, -1];
        confirmation = 3 * 22.4; // 3 seconds confirmation
        confirmationRequiresVisibleEnemies = true;
        return reaction;
      }

      if (enemyWarriorWorkers > 2) {
        // Detect warrior and worker rush
        if ((enemies > warriors) && near(enemyX, enemyY, homeX, homeY, 80)) {
          // Set strategy to zealots only (4)
          console.log("Detected warrior worker rush");
          distance = 100;
          reaction = [1, 4, 1, 1];
          confirmation = 3 * 22.5; // 3 seconds confirmation
          confirmationRequiresVisibleEnemies = true;
          return reaction;
        }
      } else {
        // Detect first expansion challenged
        if ((enemies > warriors) && near(enemyX, enemyY, homeX, homeY, 40)) {
          // Set strategy to single-base (1)
          console.log("Detected first expansion challenged");
          detectedFirstExpansionChallenged = true;
          distance = 50;
          reaction = [1, 1, -1, 1];
          confirmation = 3 * 22.4; // 3 seconds confirmation
          confirmationRequiresVisibleEnemies = false;
          return reaction;
        }
      }

    }

    reaction = null;
    confirmation = null;

    if (strategy > 0) {
      // Set strategy back to the standard (0) and remove any goals to counter cheese tactics
      console.log("Set strategy back to the standard");
      canUseSingleBaseStrategy = false;
      return [1, -1, -1, -1];
    }

    return [1, 0, -1, -1];
  }

}

function near(x1, y1, x2, y2, distance) {
  const d = (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
  return d <= distance * distance;
}
