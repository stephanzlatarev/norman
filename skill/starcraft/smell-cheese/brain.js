
let distance;
let reaction;
let confirmation;

let confirmationRequiresVisibleEnemies;

let detectedFirstExpansionChallenged = false;

let watchForZerglingRush = true;
let detectedZerglingRush = false;

let watchForQueenRush = true;
let detectedQueenRush = false;

let watchForReaperRush = true;
let detectedReaperRush = false;

export default class Brain {

  react(...input) {
    const strategy = input[0];
    const homeX = input[1];
    const homeY = input[2];
    const nexuses = input[3];
    const warriors = input[4];

    const enemyRace = input[5];
    const enemyVisibleCount = input[6];
    const enemies = input[7] + input[8];
    const enemyWarriorWorkers = input[9];
    const enemyX = input[10] ? input[10] : input[12];
    const enemyY = input[11] ? input[11] : input[13];

    const enemyBunker = input[14];
    const enemyCyclone = input[15];
    const enemyHydralisk = input[16];
    const enemyMarauder = input[17];
    const enemyMarine = input[18];
    const enemyQueen = input[19];
    const enemyReaper = input[20];
    const enemyRoach = input[21];
    const enemyTank = input[22];
    const enemyZergling = input[23];

    if (enemyRace === 1) {

      if (watchForReaperRush) {
        if (enemyMarine + enemyBunker + enemyTank + enemyMarauder + enemyCyclone >= 1) {
          watchForReaperRush = false;
          detectedReaperRush = false;
        } else if (detectedReaperRush || (enemyReaper >= 1)) {
          if (!detectedReaperRush) console.log("Detected reaper rush");
          detectedReaperRush = true;
          reaction = null;
          return [3];
        }
      }
      
    } else if (enemyRace === 2) {

      if (watchForZerglingRush) {
        if (enemyHydralisk + enemyRoach + enemyQueen >= 2) {
          watchForZerglingRush = false;
          detectedZerglingRush = false;
        } else if (detectedZerglingRush || (enemyZergling >= 4)) {
          if (!detectedZerglingRush) console.log("Detected zergling rush");
          detectedZerglingRush = true;
          reaction = null;
          return [2];
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
          return [5];
        }
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

    if ((nexuses === 1) && enemyVisibleCount && (enemies > 1)) {

      // Detect worker rush
      if (near(enemyX, enemyY, homeX, homeY, 20)) {
        // Set strategy to single-base (1) and raise goal to counter worker rush
        console.log("Detected worker rush");
        distance = 30;
        reaction = [1];
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
          reaction = [4];
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
          reaction = [1];
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
      return [0, 0];
    }

    if (warriors >= 4) {
      // We've got enough warriors to not worry about worker rush
      let expectCheesyTactics = false;

      if (enemyRace === 1) {
        expectCheesyTactics = watchForZerglingRush || watchForQueenRush;
      } else if (enemyRace === 2) {
        expectCheesyTactics = watchForReaperRush;
      }

      if (!expectCheesyTactics) {
        console.log("Not expecting cheesy tactics anymore");
        return [0, 0];
      }
    }
  }

}

function near(x1, y1, x2, y2, distance) {
  const d = (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
  return d <= distance * distance;
}
