import { spawn } from "child_process";
import starcraft from "@node-sc2/proto";

const SHOULD_BUILD_NEXUS = false; // Should test location by building a nexus
const SPEED = 0;                  // Speed in milliseconds between steps
const GAME_CONFIG = {
  path: "C:\\games\\StarCraft II",
  version: "Base89165",
  realtime: false,
  _localMap: { "mapPath": "MoondanceAIE.SC2Map" },
  battlenetMapName: "Data-C",
  playerSetup: [
    { type: 1, race: 3 },
    { type: 2, race: 4, difficulty: 1 }
  ]
};

export const RESOURCES = { 
  146: "mineral", 147: "mineral", 341: "mineral", 483: "mineral",
  665: "mineral", 666: "mineral", 796: "mineral", 797: "mineral",
  884: "mineral", 885: "mineral", 886: "mineral", 887: "mineral",
  342: "vespene", 343: "vespene", 344: "vespene",
  608: "vespene", 880: "vespene", 881: "vespene",
};

const client = starcraft();

async function go() {
  await startGame();
  await client.step({ count: 1 });

  const expansions = [];
  let expansion = null;

  let probe = (await client.observation()).observation.rawData.units.find(unit => unit.unitType === 84);
  let orders;
  await move(client, probe, probe.pos.x + 0.1, probe.pos.y);

  let clusters;
  while (true) {
    const observation = (await client.observation()).observation;

    if (!clusters) {
      clusters = clusterResources(observation);
      clusters.sort((a, b) => (a.x - b.x));
    }

    probe = observation.rawData.units.find(unit => unit.tag === probe.tag);

    if (!probe.orders.length) {
      const cluster = clusters[0];

      if (SHOULD_BUILD_NEXUS && expansion) {
        console.log("Building nexus at", expansion.x, expansion.y);
        await build(client, probe, expansion.x, expansion.y);
        expansion = null;
      } else if (!cluster) {
        break;
      } else if ((Math.abs(probe.pos.x - cluster.x) > 1) || (Math.abs(probe.pos.y - cluster.y) > 1)) {
        console.log("Probe is moving to the cluster at", cluster.x, cluster.y);
        await move(client, probe, cluster.x, cluster.y);
      } else if (observation.playerCommon.minerals >= 400) {
        console.log("Probe is near the cluster at", cluster.x, cluster.y);

        expansion = await pinExpansion(client, cluster, probe);
        expansions.push(expansion.code);
        clusters.splice(0, 1);
      }
    } else if (JSON.stringify(probe.orders) !== orders) {
      orders = JSON.stringify(probe.orders);
      console.log(orders);
    }

    await client.step({ count: 1 });

    if (SPEED) await new Promise(r => setTimeout(r, SPEED));
  }

  console.log("Expansions:");
  for (const expansion of expansions) console.log(expansion);

  await client.quit();
}

async function move(client, probe, x, y) {
  const command = { unitTags: [probe.tag], abilityId: 16, targetWorldSpacePos: { x: x, y: y }, queueCommand: false };
  await client.action({ actions: [{ actionRaw: { unitCommand: command } }] });
}

async function build(client, probe, x, y) {
  const command = { unitTags: [probe.tag], abilityId: 880, targetWorldSpacePos: { x: x, y: y }, queueCommand: false };
  await client.action({ actions: [{ actionRaw: { unitCommand: command } }] });
}

async function startGame() {
  console.log("Starting StarCraft II game...");

  spawn("..\\Versions\\" + GAME_CONFIG.version + "\\SC2.exe", [
    "-displaymode", "0", "-windowx", "0", "-windowy", "0",
    "-windowwidth", "1920", "-windowwidth", "1440",
    "-listen", "127.0.0.1", "-port", "5000"
  ], {
    cwd: GAME_CONFIG.path + "\\Support"
  });

  for (let i = 0; i < 12; i++) {
    try {
      await client.connect({ host: "localhost", port: 5000 });
      break;
    } catch (_) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  await client.createGame(GAME_CONFIG);

  await client.joinGame({
    race: GAME_CONFIG.playerSetup[0].race,
    options: { raw: true },
  });
}

function clusterResources(observation) {
  const resources = observation.rawData.units.filter(unit => RESOURCES[unit.unitType]);
  const clusters = findClusters(resources);
  const result = [];

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];

    let minX = 1000;
    let minY = 1000;
    let maxX = 0;
    let maxY = 0;

    for (let j = 0; j < cluster.length; j++) {
      const resource = cluster[j];

      minX = Math.min(minX, resource.x);
      maxX = Math.max(maxX, resource.x);
      minY = Math.min(minY, resource.y);
      maxY = Math.max(maxY, resource.y);
    }

    const x = (maxX + minX) / 2;
    const y = (maxY + minY) / 2;
    result.push({
      code: x + " " + y,
      resources: cluster,
      x: Math.floor(x),
      y: Math.floor(y),
    });
  }

  return result;
}

function findClusters(resources) {
  const clusters = [];

  for (const raw of resources) {
    const resource = { x: raw.pos.x, y: raw.pos.y };
    const list = [];

    for (let i = clusters.length - 1; i >= 0; i--) {
      if (isResourceInCluster(resource, clusters[i])) {
        list.push(i);
      }
    }

    if (list.length === 0) {
      clusters.push([resource]);
    } else if (list.length === 1) {
      clusters[list[0]].push(resource);
    } else {
      let join = [resource];
      for (const i of list) {
        join = join.concat(clusters[i]);
        clusters.splice(i, 1);
      }
      clusters.push(join);
    }
  }

  return clusters;
}

function isResourceInCluster(resource, cluster) {
  const distance = 5;

  for (const object of cluster) {
    if ((Math.abs(object.x - resource.x) < distance) && (Math.abs(object.y - resource.y) < distance)) {
      return true;
    }
  }

  return false;
}

async function pinExpansion(client, cluster, probe) {
  const x = cluster.x;
  const y = cluster.y;

  let bestD = 1000000000;
  let bestX = 0;
  let bestY = 0;

  const tests = {};
  for (let testY = y - 10; testY <= y + 10; testY += 0.5) {
    for (let testX = x - 10; testX <= x + 10; testX += 0.5) {
      if (await test(client, probe, testX, testY)) {
        const d = distance(cluster, testX, testY);
        if (d < bestD) {
          bestD = d;
          bestX = testX;
          bestY = testY;
        }
        tests[key(testX, testY)] = "L";
      }
    }
  }

  show(cluster, tests, x, y, bestX, bestY);

  await move(client, probe, probe.pos.x + 1, probe.pos.y);

  return { x: bestX, y: bestY, code: `"${cluster.code}": { x: ${bestX}, y: ${bestY} },` };
}

async function test(client, probe, x, y) {
  const command = { unitTags: [probe.tag], abilityId: 880, targetWorldSpacePos: { x: x, y: y }, queueCommand: false };
  const response = await client.action({ actions: [{ actionRaw: { unitCommand: command } }] });

  return (response.result[0] === 1);
}

function key(x, y) {
  return Math.floor(x * 2) + ":" + Math.floor(y * 2);
}

function distance(cluster, x, y) {
  let sum = 0;
  let count = 0;

  for (const resource of cluster.resources) {
    const rx = resource.x;
    const ry = resource.y;
    sum += (rx - x) * (rx - x) + (ry - y) * (ry - y);
    count++;
  }

  return sum / count;
}

function show(cluster, tests, x, y, bestX, bestY) {
  for (const resource of cluster.resources) {
    tests[key(resource.x, resource.y)] = "@";
  }

  console.log();
  for (let testY = y + 10; testY >= y - 10; testY -= 0.5) {
    let line = " ";
    for (let testX = x - 10; testX <= x + 10; testX += 0.5) {
      if ((testX === bestX) && (testY === bestY)) {
        line += "X";
      } else if (tests[key(testX, testY)]) {
        line += tests[key(testX, testY)];
      } else {
        line += "-";
      }
    }
    console.log(line);
  }
}

go();
