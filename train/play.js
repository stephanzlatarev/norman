import { map, pov, score } from "./starcraftGame.js";
import { observe, protocol } from "./starcraftProtocol.js";
import { toAction, toData } from "./commands.js";

export default class {

  constructor() {
    this.phase = "build-formation";
  }

  async go(brain) {
    let wins = 0;

    while (wins < 1) {
      this.samples = [];
      this.phase = "build-formation";
      await protocol.start();
      await protocol.step();

      while (protocol.nexus() && (protocol.probes().length > 0) && (protocol.drones().length > 0)) {
        await protocol.step();
        await this.step();
      }

      const context = await observe();
      if (context) {
        const samplesScore = score(context);
        if (samplesScore > 0) {
          wins++;

          console.log("New sample set of size", this.samples.length, "and score", samplesScore);

let moves = 0;
let attacks = 0;
for (const sample of this.samples) {
  const action = toAction(sample.output);
  if (action.abilityId === 16) moves++;
  if (action.abilityId === 3674) attacks++;
}
console.log("Moves:", moves, "Attacks:", attacks);

          for (const sample of this.samples) {
            brain.learn(sample.input, sample.output, samplesScore);
          }
        }
      }
    }

    console.log("READY FOR SELF-LEARNING");
  }

  async step() {
    if (this.phase === "build-formation") {
      this.movement = await buildFormation(protocol, this.samples);
      this.phase = "read-formation";
    } else if (this.phase === "read-formation") {
      this.formation = readFormation(protocol);
      this.phase = "are-moving";
    } else if (this.phase === "are-moving") {
      if (!(await checkAreMoving(protocol, this.formation, this.movement, this.samples))) {
        this.phase = "wait-for-enemies";
      }
    } else if (this.phase === "wait-for-enemies") {
      if (checkForEnemies(protocol)) {
        this.phase = "fight";
      }
    } else if (this.phase === "fight") {
      await fight(protocol, this.samples);
    }
  }

}

async function buildFormation(game, samples) {
  const movement = {};
  const probes = game.probes();

  const context = await observe();
  const situation = map(context);

  for (const probe of probes) {
    const x = probes[0].pos.x + Math.random() * 2;
    const y = probes[0].pos.y + Math.random() * 4 - 2;
    await game.command(probe.tag, 16, x, y);

    movement[probe.tag] = toData({ abilityId: 16, x: x - probe.pos.x, y: y - probe.pos.y });
    samples.push({ input: pov(situation, probe.tag), output: movement[probe.tag] });
  }

  return movement;
}

function readFormation(game) {
  const formation = {};
  const probes = game.probes();

  for (const probe of probes) {
    formation[probe.tag] = JSON.stringify(probe.orders);
  }

  return formation;
}

async function checkAreMoving(game, formation, movement, samples) {
  let probes = game.probes();
  let areMoving = false;

  const context = await observe();
  const situation = map(context);

  for (const probe of probes) {
    if (JSON.stringify(probe.orders) === formation[probe.tag]) {
      areMoving = true;
      samples.push({ input: pov(situation, probe.tag), output: movement[probe.tag] });
    }
  }

  return areMoving;
}

function checkForEnemies(game) {
  return game.drones().length >= 3;
}

async function fight(game, samples) {
  let probes = game.probes();
  let enemies = game.drones();

  const context = await observe();
  const situation = map(context);

  for (const probe of probes) {
    const enemy = findClosestEnemy(probe, enemies);
    if (enemy) {
      await game.command(probe.tag, 3674, enemy.pos.x, enemy.pos.y);

      samples.push({ input: pov(situation, probe.tag), output: toData({ abilityId: 3674, x: enemy.pos.x - probe.pos.x, y: enemy.pos.y - probe.pos.y }) });
    }
  }
}

function findClosestEnemy(probe, enemies) {
  let closestEnemy = null;
  let closestDistance = 1000;
  for (const enemy of enemies) {
    const distance = Math.abs(probe.pos.x - enemy.pos.x) + Math.abs(probe.pos.y - enemy.pos.y);
    if (distance < closestDistance) {
      closestEnemy = enemy;
      closestDistance = distance;
    }
  }
  return closestEnemy;
}
