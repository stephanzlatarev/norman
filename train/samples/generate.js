// TODO: Take as argument the game ("starcraft") and scenario ("probes-3x3")
// Then use the pov function in the given game to transfer the scenario data into learning samples

import fs from "fs";

// TODO: Use the gherkin skill file
const SCENARIOS = [
  // Given drones are close
  // And we are in formation
  // Then attack

  // Given we surround drones
  // Then attack

  // Given drones are at a distance
  // Then move in formation

  // Given drones are close
  // But we are not in formation
  // Then move in formation
];

export default async function() {
  const samples = [];

  // Wing is straight ahead
  for (let wingDistance = 1; wingDistance <= 8; wingDistance++) {
    for (let enemyDistance = 1; enemyDistance <= 8; enemyDistance++) {
      // Attack towards wing
      addSample(samples, enemyDistance, wingDistance, 1, true, 1);
    }
  }

  // Wing is to the right and ahead
  addSample(samples, 1, 1, 2, true, 1);
  for (let enemyDistance = 2; enemyDistance <= 8; enemyDistance++) {
    // Move forward surrounding enemy
    addSample(samples, enemyDistance, 1, 2, false, 8);
  }

  // Wing is to the right and ahead but a distance
  for (let wingDistance = 2; wingDistance <= 8; wingDistance++) {
    // When enemy is close move back in wing's direction
    addSample(samples, 1, wingDistance, 2, false, 3);

    for (let enemyDistance = 2; enemyDistance <= 8; enemyDistance++) {
      // Move towards enemy
      addSample(samples, enemyDistance, wingDistance, 2, false, 1);
    }
  }

  // Wing is right beside me
  addSample(samples, 1, 1, 3, true, 1);
  for (let enemyDistance = 2; enemyDistance <= 8; enemyDistance++) {
    // Move forward surrounding enemy
    addSample(samples, enemyDistance, 1, 3, false, 8);
  }

  // Wing is beside me but a distance
  for (let wingDistance = 2; wingDistance <= 8; wingDistance++) {
    // When enemy is close move back in wing's direction
    addSample(samples, 1, wingDistance, 3, false, 4);

    for (let enemyDistance = 2; enemyDistance <= 8; enemyDistance++) {
      // Move towards wing
      addSample(samples, enemyDistance, wingDistance, 3, false, 3);
    }
  }

  // Wing is behind me
  for (let wingDistance = 1; wingDistance <= 8; wingDistance++) {
    for (let enemyDistance = 1; enemyDistance <= 8; enemyDistance++) {
      // Move back towards wing
      addSample(samples, enemyDistance, wingDistance, 4, false, 4);
      addSample(samples, enemyDistance, wingDistance, 5, false, 5);
    }
  }

  fs.writeFileSync("./train/sandbox/samples/test.json", "[\r\n" + samples.join(",\r\n") + "\r\n]");
}

function addSample(samples, enemyDistance, wingDistance, wingAngle, commandAttack, commandAngle) {
  samples.push(JSON.stringify({ input: generateInput(enemyDistance, wingDistance, wingAngle), output: generateOutput(commandAttack, commandAngle) }));
}

const POV_SIZE = 65*2;
function generateInput(enemyDistance, wingDistance, wingAngle) {
  const pov = [];
  for (let i = 0 ; i < POV_SIZE; i++) pov.push(0);

  // self
  pov[65] = 0.1;

  // wing
  pov[65 + (wingDistance - 1) * 8 + wingAngle] = 0.1;

  // enemy
  pov[(enemyDistance - 1) * 8 + 1] = 0.1;

  return pov;
}

function generateOutput(commandAttack, commandAngle) {
  return [commandAttack ? 0.85 : 0.5, (commandAngle - 1) / 8];
}
