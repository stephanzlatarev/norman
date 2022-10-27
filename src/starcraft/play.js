import { Game } from "./game.js";
import log from "../log.js";

let game;
let isRunning = true;
let hasGreetedOpponent = false;
let isDefendingFromEnemy = null;

export async function start(args) {
  game = new Game(args);
  isRunning = true;

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
  const nexus = game.get("nexus");
  if (!nexus) return;

  const enemy = game.enemy();
  if (!enemy && isDefendingFromEnemy) isDefendingFromEnemy = "stop";
  if (!enemy) return;

  const zealots = game.list("zealot");
  if (zealots.length) return;

  const distance = Math.abs(nexus.pos.x - enemy.pos.x) + Math.abs(nexus.pos.y - enemy.pos.y);
  if (distance < 20) {
    if (isDefendingFromEnemy !== enemy.tag) {
      const probes = game.list("probe");

      for (const probe of probes) {
        await game.attack(probe.tag, enemy.tag);
      }

      isDefendingFromEnemy = enemy.tag;
    }
  } else if (isDefendingFromEnemy) {
    isDefendingFromEnemy = "stop";
  }
}

async function checkHarvestWorkers() {
  if (isDefendingFromEnemy !== "stop") return;

  const probes = game.list("probe");

  for (const probe of probes) {
    if (probe.orders.length && (probe.orders[0].abilityId === 23)) {
      await game.harvest(probe.tag);
    }
  }

  isDefendingFromEnemy = null;
}
