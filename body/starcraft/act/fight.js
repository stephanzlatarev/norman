import { IS_MILITARY } from "../units.js";
import attack from "./attack.js";
import { Hotspots } from "./hotspots.js";

// The minimum considered troops deployment value
const DEPLOYMENT_THRESHOLD = 0.001;

export default async function(model, client) {
  const map = model.get("Map");
  const hotspots = new Hotspots(map.data, map.get("Military scale"));

  const warriors = model.observation.ownUnits.filter(unit => IS_MILITARY[unit.unitType]);
  const ownMilitary = model.get("Heatmap own military").values(100);
  const deployment = model.add("Troops deployment").values(100);

  if (warriors.length) {
    scaleDeployment(ownMilitary, deployment);

    for (const warrior of warriors) {
      hotspots.addWarrior(warrior);
    }
  }

  const enemies = model.observation.enemyUnits;
  const enemyEconomy = model.get("Heatmap enemy economy").values(100);

  for (const enemy of enemies) {
    if (IS_MILITARY[enemy.unitType]) {
      hotspots.addEnemy(enemy);
    } else {
      hotspots.addDummy(enemy);
    }
  }
  for (let spot = 0; spot < enemyEconomy.length; spot++) {
    if (enemyEconomy[spot]) {
      hotspots.addDummy({ heatmapPosition: spot });
    }
  }

  const { deploy, attack, defend, destroy } = hotspots.deploy(deployment);
  await issueAttackCommands(client, attack);
  await issueDefendCommands(client, defend);
  await issueDeployCommands(client, deploy);
  await issueDestroyCommands(client, destroy);
}

async function command(client, unitTags, abilityId, target) {
  const command = { unitTags: unitTags, abilityId: abilityId, targetWorldSpacePos: { x: target.x, y: target.y }, queueCommand: false };
  const response = await client.action({ actions: [{ actionRaw: { unitCommand: command } }] });
  if (response.result[0] !== 1) console.log(JSON.stringify(command), ">>", JSON.stringify(response));
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

async function issueDeployCommands(client, deploys) {
  for (const transport of deploys) {
    await command(client, [transport.unit.tag], 16, transport.pos);
  }
}

async function issueDestroyCommands(client, hotspots) {
  for (const hotspot of hotspots) {
    await command(client, hotspot.warriors.map(unit => unit.tag), 3674, hotspot.dummies[0].pos);
  }
}
