import { ActiveCount, Depot, Memory, Order, Units } from "./imports.js";

export default function() {
  const previousLimitBase = Memory.LimitBase;

  setBaseLimit();

  if ((Memory.LimitBase < previousLimitBase) && !Memory.FlagSecureAntreZone) {
    cancelExposedConstructions();
  }

}

function setBaseLimit() {
  if ((ActiveCount.Nexus === 1) && (ActiveCount.Oracle >= 2)) { // TODO: Improve with more intel
    // Secure second base
    Memory.LimitBase = 2;
  } else if (Memory.LevelEnemyRush) {
    // Don't expand if we expect an enemy rush
    Memory.LimitBase = 1;
  } else if ((ActiveCount.Nexus === 1) && (Memory.LevelEnemyArmySuperiority > 2)) {
    // Don't start first expansion before we have army to defend it
    Memory.LimitBase = 1;
  } else {
    Memory.LimitBase = Depot.list().length;
  }

  Memory.FlagSecureAntreZone = ((ActiveCount.Nexus === 1) && (Memory.LimitBase === 2));
}

function cancelExposedConstructions() {
  for (const building of Units.buildings().values()) {
    // Keep all buildings in the home base
    if (building.zone === Depot.home) continue;

    // Keep the Gateway so that in case it finishes we can start a CyberneticsCore sooner
    if (building.type.name === "Gateway") continue;

    // Keep CyberneticsCore if it's halfway ready.
    if ((building.type.name === "CyberneticsCore") && (building.buildProgress > 0.5)) continue;

    if (building.buildProgress < 1) {
      new Order(building, 3659).accept(true);
    }
  }
}
