import { IS_MILITARY } from "../units.js";

// TODO: Add knownEnemyMilitary and knownEnemyEconomy
// When known enemy unit is within vision and we don't observe such a unit then remove it
// When known enemy unit is outside vision then keep it in the heatmap even if we don't observe it
// Observed units replace known enemy units of the same tag even if the known enemy unit is outside vision
// Body to calculate "productivity" and "security" measurements.
// Train "plan economy" skill to optimize "productivity".
// Train "deploy troops" skill to optimize "security".


const HEATMAP = []; for (let i = 0; i < 100; i++) HEATMAP.push(0);

export function observeHeatmap(model, observation) {
  updateKnowns(model, observation);

  const grid = model.get("Map").data;

  const ownMilitary = makeHeatmap(grid, model.knowns.ownMilitary);
  const ownEconomy = makeHeatmap(grid, model.knowns.ownEconomy);
  const enemyMilitary = makeHeatmap(grid, model.knowns.enemyMilitary);
  const enemyEconomy = makeHeatmap(grid, model.knowns.enemyEconomy);

  scaleHeatmaps(ownMilitary, enemyMilitary);
  scaleHeatmaps(ownEconomy, enemyEconomy);

  addToMemory(model, "Heatmap own military", ownMilitary);
  addToMemory(model, "Heatmap own economy", ownEconomy);
  addToMemory(model, "Heatmap enemy military", enemyMilitary);
  addToMemory(model, "Heatmap enemy economy", enemyEconomy);
}

function updateKnowns(model, observation) {
  if (!model.knowns) {
    model.knowns = { mapResources: {}, ownMilitary: {}, ownEconomy: {}, enemyMilitary: {}, enemyEconomy: {} };

    const enemy = model.get("Enemy");
    model.knowns.enemyEconomy["base"] = { pos: { x: enemy.get("baseX"), y: enemy.get("baseY") }, health: 100, healthMax: 100 };
  }

  markPreviouslyObservedUnits(model.knowns.ownMilitary);
  markPreviouslyObservedUnits(model.knowns.ownEconomy);
  markPreviouslyObservedUnits(model.knowns.enemyMilitary);
  markPreviouslyObservedUnits(model.knowns.enemyEconomy);

  observeUnits(observation.ownUnits, model.knowns.ownMilitary, model.knowns.ownEconomy);
  observeUnits(observation.enemyUnits, model.knowns.enemyMilitary, model.knowns.enemyEconomy);

  removeMissingUnits(model.knowns.ownMilitary);
  removeMissingUnits(model.knowns.ownEconomy);
  removeMissingUnits(model.knowns.enemyMilitary, observation.ownUnits);
  removeMissingUnits(model.knowns.enemyEconomy, observation.ownUnits);
}

function markPreviouslyObservedUnits(collection) {
  for (const tag in collection) collection[tag].observed = false;
}

function observeUnits(units, militaryCollection, economyCollection) {
  for (const unit of units) {
    unit.observed = true;

    if (IS_MILITARY[unit.unitType]) {
      militaryCollection[unit.tag] = unit;
    } else {
      economyCollection[unit.tag] = unit;
    }
  }
}

function removeMissingUnits(collection, observers) {
  for (const tag in collection) {
    const unit = collection[tag];

    if (!unit.observed) {
      if (observers) {
        if (observers.find(observer => near(unit.pos.x, unit.pos.y, observer.pos.x, observer.pos.y, 6))) {
          // This is an enemy building or unit. Remove it because it was within vision but is not there now.
          delete collection[tag];
        }
      } else {
        // This is an own building or unit. Remove it because it's not there
        delete collection[tag];
      }
    }
  }
}

function near(x1, y1, x2, y2, distance) {
  return (Math.abs(x1 - x2) <= distance) && (Math.abs(y1 - y2) <= distance);
}

function makeHeatmap(grid, units) {
  const heatmap = [...HEATMAP];

  for (const tag in units) {
    addToHeatmap(grid, heatmap, units[tag]);
  }

  return heatmap;
}

function addToHeatmap(grid, heatmap, unit) {
  const x = Math.floor((unit.pos.x - grid.left) / grid.cellWidth);
  const y = Math.floor((unit.pos.y - grid.top) / grid.cellHeight);
  let value = 1;

  if (unit.healthMax) {
    const health = unit.shieldMax ? (unit.health + unit.shield) / (unit.healthMax + unit.shieldMax) : unit.health / unit.healthMax;

    value = health;
  }

  heatmap[y * 10 + x] += value;
}

function scaleHeatmaps(...heatmaps) {
  let scale = 0;

  for (const heatmap of heatmaps) {
    for (const value of heatmap) {
      scale = Math.max(scale, value);
    }
  }

  for (const heatmap of heatmaps) {
    for (let i = 0; i < heatmap.length; i++) {
      heatmap[i] /= scale;
    }
  }
}

function addToMemory(memory, label, heatmap) {
  const node = memory.add(label);

  for (let i = 0; i < heatmap.length; i++) {
    node.set(i, heatmap[i]);
  }
}

function show(title, heatmap) {
  console.log("= __________________________________________ =", title);
  console.log(" |                                          | ");
  for (let offset = 90; offset >= 0; offset -= 10) {
    const line = [];
    for (let x = 0; x < 10; x++) {
      const v = heatmap[offset + x];
      if (v > 0) {
        let c = "" + Math.floor(v * 10);
        while (c.length < 4) c = " " + c;
        line.push(c);
      } else {
        line.push("    ");
      }
    }
    console.log(" |", line.join(""), "|");
  }
  console.log(" |__________________________________________| ");
  console.log("=                                            =");
  console.log();
}
