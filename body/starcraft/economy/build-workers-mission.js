import Mission from "../mission.js";

// TODO: Put the limit into memory
const LIMIT_WORKERS = 100;

export default class BuildWorkersMission extends Mission {

  run(commands, model) {
    const observation = model.observation;
    let workers = observation.playerCommon.foodWorkers;

    if (!canBuildWorker(observation.playerCommon, workers)) return;

    const depots = observation.ownUnits.filter(unit => (unit.unitType === 59));

    workers += countBuildingWorkers(depots);

    for (const depot of depots) {
      if (canBuildWorker(observation.playerCommon, workers, depot)) {
        commands.push({ unitTags: [depot.tag], abilityId: 1006, queueCommand: false });
        observation.playerCommon.minerals -= 50;
        observation.playerCommon.foodUsed += 1;
        workers++;
      }
    }
  }

}

function countBuildingWorkers(depots) {
  let count = 0;

  for (const depot of depots) {
    for (const order of depot.orders) {
      if (order.abilityId === 1006) {
        count++;
      }
    }
  }

  return count;
}

function canBuildWorker(stats, workers, depot) {
  if (workers >= LIMIT_WORKERS) return false;
  if (stats.minerals < 50) return false;
  if (stats.foodUsed >= stats.foodCap) return false;
  if (depot && (depot.buildProgress < 1)) return false;
  if (depot && depot.orders.length) return false;

  return true;
}
