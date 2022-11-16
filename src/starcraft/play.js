import { Game } from "./game.js";
import Brain from "../brain.js";
import Probe from "./probe.js";
import log from "../log.js";

const probe = new Probe();
const brain = new Brain(probe, null, "file://" + (process.cwd().startsWith("C:") ? process.cwd().slice(2) : process.cwd()) + "/skills/probe");

let game;
let isRunning;
let hasGreetedOpponent;
let isDefendingFromEnemy;

export async function start(args) {
  game = new Game(args);
  isRunning = true;
  hasGreetedOpponent = false;
  isDefendingFromEnemy = false;

  await game.connect();
  await game.start();

  while (isRunning) {
    try {
      await game.step();

      await checkGreet();
      await checkBuildWorker();
      await checkBuildPylon();
      await checkBuildGateway();
      await checkBuildZealot();
      await checkAttackZealot();
      await checkDefendWorkers();
      await checkHarvestWorkers();
      await checkEnd();
    } catch (error) {
      log("ERROR:", error);
    }
  }

  await game.quit();
}

export function stop() {
  isRunning = false;
}

async function checkGreet() {
  if (!hasGreetedOpponent && (game.time() > 10)) {
    await game.chat("Good luck!");
    hasGreetedOpponent = true;
  }
}

async function checkEnd() {
  const nexus = game.get("nexus");
  const probes = game.list("probe");
  const zealots = game.list("zealot");

  if (!nexus || (probes.length + zealots.length === 0)) {
    await game.chat("gg");
    isRunning = false;
  }
}

async function checkBuildWorker() {
  if (game.workers() >= 16) return;

  const nexus = game.get("nexus");

  if (nexus && (game.minerals() >= 50) && (game.energyUse() < game.energySupply()) && (nexus.orders.length === 0)) {
    await game.train("probe");
    await game.use("chronoboost");
  }
}

async function checkBuildPylon() {
  if (game.isBuilding()) return;

  if ((game.minerals() >= 100) && (game.energyUse() > game.energySupply() - 10)) {
    await game.build("pylon");
  }
}

async function checkBuildGateway() {
  if (game.isBuilding()) return;

  if ((game.minerals() >= game.list("gateway").length * 100 + 150) && (game.energyUse() <= game.energySupply() - 2)) {
    await game.build("gateway");
  }
}

async function checkBuildZealot() {
  if ((game.minerals() < 100) || (game.energyUse() > 198)) return;

  const gateways = game.list("gateway");

  for (const gateway of gateways) {
    if (gateway.orders.length === 0) {
      await game.train("zealot", gateway.tag);
      await game.use("chronoboost", gateway.tag);
    }
  }
}

async function checkAttackZealot() {
  const zealots = game.list("zealot");
  const enemy = game.enemy();

  for (const zealot of zealots) {
    if (enemy && ((zealot.orders.length === 0) || (zealot.orders[0].targetUnitTag !== enemy.tag))) {
      await game.attack(zealot.tag, enemy.tag);
    } else if (zealot.orders.length === 0) {
      await game.use("attack", zealot.tag);
    }
  }
}

async function checkDefendWorkers() {
  isDefendingFromEnemy = shouldDefendWithWorkers();

  if (!isDefendingFromEnemy) return;

  const probes = game.list("probe");
  const situation = game.situation();

  for (const unit of probes) {
    const probe = new Probe(unit.tag);

    probe.situate(situation);
    probe.motor = await brain.react(probe.sensor);

    await game.command(unit, probe.toCommand());
  }
}

function shouldDefendWithWorkers() {
  const nexus = game.get("nexus");
  if (!nexus) return false;

  const zealots = game.list("zealot");
  if (zealots.length) return false;

  const enemy = game.enemy();
  if (!enemy) return false;

  if (Math.abs(nexus.pos.x - enemy.pos.x) + Math.abs(nexus.pos.y - enemy.pos.y) > 50) return false;

  return true;
}

async function checkHarvestWorkers() {
  if (isDefendingFromEnemy) return;

  const probes = game.list("probe");

  for (const probe of probes) {
    if (probe.orders.length && (probe.orders[0].abilityId === 23)) {
      await game.harvest(probe.tag);
    }
  }
}
