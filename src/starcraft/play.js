import { Game } from "./game.js";

let game;
let isRunning = true;
let hasGreetedOpponent = false;
let markEnergySupply = 0;
let markGateways = 0;

export async function start(args) {
  game = new Game(args);
  isRunning = true;

  await game.start();

  while (isRunning) {
    await checkGreet();
    await checkBuildWorker();
    await checkBuildPylon();
    await checkBuildGateway();
    await checkEnd();

    await game.step();
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
  if (game.minerals() > 3000) {
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
  if ((game.minerals() >= 100) && (game.energyUse() > game.energySupply() - 5) && (markEnergySupply !== game.energySupply())) {
    markEnergySupply = game.energySupply();
    await game.build("pylon");
  }
}

async function checkBuildGateway() {
  if (game.minerals() >= markGateways * 100 + 150) {
    markGateways++;
    await game.build("gateway");
  }
}
