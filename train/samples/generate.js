// TODO: Take as argument the game ("starcraft") and scenario ("probes-3x3")
// Then use the pov function in the given game to transfer the scenario data into learning samples

import fs from "fs";
import { pov } from "../starcraft/game.js";
import { toData } from "../starcraft/commands.js";

// TODO: Use the gherkin skill file
const SCENARIOS = [
  // Given drones are at a distance
  // Then move in formation

  // Given drones are close
  // And we are in formation => attack

  // Given drones are close
  // But we are not in formation
  // Then move in formation
];

export default async function() {
  const samples = [];

  for (let wdx = 0; wdx <= 10; wdx++) {
    for (let wdy = -10; wdy <= 10; wdy++) {
      if ((wdx === 0) && (wdy === 0)) continue;

      for (let edy = 1; edy <= 15; edy++) {
        const shouldAttack = (edy === 1) && (wdx === 1) && (wdy === 1);

        addSample(samples, { input: generateInput(wdx, wdy, edy), output: generateOutput(shouldAttack, wdx, wdy, edy) });
      }
    }
  }

  fs.writeFileSync("./train/sandbox/samples/test.json", "[\r\n" + samples.join(",\r\n") + "\r\n]");
}

function addSample(samples, sample) {
  const sampleAsText = JSON.stringify(sample);

  if (samples.indexOf(sampleAsText) < 0) {
    samples.push(sampleAsText);
  }
}

function generateInput(wingDistanceX, wingDistanceY, enemyDistanceY) {
  const SELF_X = 100;
  const SELF_Y = 100;
  const situation = [
    { tag: "self", owner: 1, pos: { x: SELF_X, y: SELF_Y } },
    { tag: "wingman", owner: 1, pos: { x: SELF_X + wingDistanceX, y: SELF_Y + wingDistanceY } },
    { tag: "enemy", owner: 1, pos: { x: SELF_X, y: SELF_Y + enemyDistanceY } },
  ];

  return pov(situation, "self");
}

function generateOutput(shouldAttack, wingDistanceX, wingDistanceY, enemyDistanceY) {
  if (shouldAttack) {
    return toData({ abilityId: 3674, x: 0, y: enemyDistanceY });
  } else {
    return toData({ abilityId: 16, x: wingDistanceX, y: wingDistanceY - 1 }); // "- 1" means we get in formation relative to the enemy
  }
}
