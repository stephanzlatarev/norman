import { IS_MILITARY } from "../units.js";
import attack from "./attack.js";

// The minimum considered troops deployment value
const DEPLOYMENT_THRESHOLD = 0.001;

export default async function(model, client) {
  const hotspots = createHotspots(model);
  const modes = createModes(hotspots);
  const troops = createTroops(hotspots);
  const transports = createTransports(modes, hotspots, troops);

  supportDefenders(modes);
  supportAttackers(modes);
  mobilizeWorkers(client, hotspots);

  await issueAttackCommands(client, modes.attack);
  await issueDefendCommands(client, modes.defend);
  await issueDestroyCommands(client, modes.destroy);
  await issueDeployCommands(client, transports);
}

async function command(client, unitTags, abilityId, target) {
  const command = { unitTags: unitTags, abilityId: abilityId, targetWorldSpacePos: { x: target.x, y: target.y }, queueCommand: false };
  const response = await client.action({ actions: [{ actionRaw: { unitCommand: command } }] });
  if (response.result[0] !== 1) console.log(JSON.stringify(command), ">>", JSON.stringify(response));
}

function createHotspots(model) {
  const hotspots = [];

  const map = model.get("Map");
  const militaryScale = map.get("Military scale");
  const grid = map.data;

  const ownMilitary = model.get("Heatmap own military").values(100);
  const enemyMilitary = model.get("Heatmap enemy military").values(100);
  const enemyEconomy = model.get("Heatmap enemy economy").values(100);
  const deployment = model.add("Troops deployment").values(100);

  const warriors = model.observation.ownUnits.filter(unit => IS_MILITARY[unit.unitType]);
  if (warriors.length) {
    scaleDeployment(ownMilitary, deployment);
  }

  for (let spot = 0; spot < ownMilitary.length; spot++) {
    const x = spot % 10;
    const y = Math.floor(spot / 10);

    hotspots.push({
      x: x,
      y: y,
      pos: {
        x: grid.left + grid.cellWidth * x + grid.cellWidthHalf,
        y: grid.top + grid.cellHeight * y + grid.cellHeightHalf,
      },
      ownMilitary: ownMilitary[spot],
      enemyMilitary: enemyMilitary[spot],
      deployment: deployment[spot],
      militaryScale: militaryScale,
      warriors: [],
      enemies: [],
      dummies: [],
    });
  }

  for (const warrior of warriors) {
    hotspots[warrior.heatmapPosition].warriors.push(warrior);
  }

  const enemies = model.observation.enemyUnits;

  for (const enemy of enemies) {
    if (IS_MILITARY[enemy.unitType]) {
      hotspots[enemy.heatmapPosition].enemies.push(enemy);
    } else {
      hotspots[enemy.heatmapPosition].dummies.push(enemy);
    }
  }
  for (let spot = 0; spot < enemyEconomy.length; spot++) {
    if (enemyEconomy[spot] && !hotspots[spot].dummies.length) {
      hotspots[spot].dummies.push({ pos: hotspots[spot].pos });
    }
  }

  return hotspots;
}

function scaleDeployment(military, deployment) {
  let sumMilitary = 0;
  let sumDeployment = 0;

  for (const value of military) {
    sumMilitary += value;
  }

  for (const value of deployment) {
    if (value >= DEPLOYMENT_THRESHOLD) {
      sumDeployment += value;
    }
  }

  const scale = sumMilitary / sumDeployment;

  for (let i = 0; i < deployment.length; i++) {
    if (deployment[i] >= DEPLOYMENT_THRESHOLD) {
      deployment[i] *= scale;
    } else {
      deployment[i] = 0;
    }
  }
}

function createModes(hotspots) {
  const modes = {
    attack: [],
    defend: [],
    destroy: [],
    support: [],
  };

  for (const hotspot of hotspots) {
    if (!hotspot.warriors.length) continue;

    if (hotspot.enemies.length && (hotspot.ownMilitary > hotspot.enemyMilitary)) {
      hotspot.mode = "attack";
    } else if (hotspot.enemies.length) {
      hotspot.mode = "defend";
    } else if (hotspot.dummies.length) {
      hotspot.mode = "destroy";
    } else {
      hotspot.mode = "support";
    }

    modes[hotspot.mode].push(hotspot);
  }

  return modes;
}

function createTroops(hotspots) {
  const troops = [];

  for (const hotspot of hotspots) {
    if (!hotspot.warriors.length || (hotspot.ownMilitary <= hotspot.deployment)) continue;

    let remainingHeat = (hotspot.ownMilitary - hotspot.deployment);
    for (const unit of hotspot.warriors) {
      const heat = unit.heatmapValue / hotspot.militaryScale;

      if (!isEngaged(unit) && ((hotspot.deployment < DEPLOYMENT_THRESHOLD) || (heat <= remainingHeat))) {
        troops.push({ unit: unit, heat: heat, hotspot: hotspot });
        remainingHeat -= heat;
      }
    }
  }

  return troops;
}

function isEngaged(unit) {
  return !!unit.orders.length;
}

function createTransports(modes, hotspots, troops) {
  const transports = [];
  if (!troops.length) return transports;

  const targets = hotspots.filter(one => (one.deployment > one.ownMilitary))
    .sort((a, b) => ((b.deployment - b.ownMilitary) - (a.deployment - a.ownMilitary)));

  for (const target of targets) {
    if (!troops.length) break;

    let remainingHeat = (target.deployment - target.ownMilitary);

    // TODO: Sort troops by distance to hotspot so that closest one get there
    for (let index = troops.length - 1; (remainingHeat > 0) && (index >= 0); index--) {
      const one = troops[index];

      if ((target.mode === "support") && (one.hotspot.mode === "attack")) continue;

      transports.push({ unit: one.unit, pos: target.pos });

      removeUnitFromHotspot(modes, one.unit, one.hotspot);
      troops.splice(index, 1);
      remainingHeat -= one.heat;
    }
  }

  return transports;
}

function removeUnitFromHotspot(modes, unit, hotspot) {
  if (hotspot.warriors.length === 1) {
    hotspot.warriors.length = 0;

    if (hotspot.mode) {
      modes[hotspot.mode].splice(modes[hotspot.mode].indexOf(hotspot), 1);
      delete hotspot.mode;
    }
  } else {
    hotspot.warriors.splice(hotspot.warriors.indexOf(unit), 1);
  }
}

function supportDefenders(modes) {
  // TODO: Implemented this
  // Move units from a support hotspot to an adjacent defend hotspot
  // Check if the defend hotspot is now an attack hotspot and change it in modes map
}

function supportAttackers(modes) {
  // TODO: Implemented this
  // Move units from a support hotspot to an adjacent attack hotspot
  // Recalculate mode of hotspots
}

function mobilizeWorkers(client, hotspots) {
  // TODO: Implemented this
  // If warriors are not enough and there are workers, then mobilize some of them
  // Mark the mobilized workers with isMobilized=true
}

async function issueAttackCommands(client, hotspots) {
  for (const hotspot of hotspots) {
    await attack(client, hotspot);
  }
}

async function issueDefendCommands(client, hotspots) {
  for (const hotspot of hotspots) {
    // TODO: Replace this with defend movements - units keep outside range of enemies and shoot those in range
    await attack(client, hotspot);
  }
}

async function issueDeployCommands(client, transports) {
  for (const transport of transports) {
    await command(client, [transport.unit.tag], 16, transport.pos);
  }
}

async function issueDestroyCommands(client, hotspots) {
  for (const hotspot of hotspots) {
    await command(client, hotspot.warriors.map(unit => unit.tag), 3674, hotspot.dummies[0].pos);
  }
}
