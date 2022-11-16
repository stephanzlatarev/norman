import starcraft from "@node-sc2/proto";
import { spawn } from "child_process";
import log from "../log.js";

const PROTOSS = 3;

const UNIT_TYPE = {
  gateway: 62,
  mineral: 341,
  nexus: 59,
  probe: 84,
  pylon: 60,
  zealot: 73,
};

export class Game {

  constructor(args) {
    this.client = starcraft();
    this.settings = parseArguments(args);
  }

  async connect() {
    await connect(this.client, this.settings);
  }

  async start() {
    await play(this.client, this.settings);

    this.gameInfo = await this.client.gameInfo();
  }

  async quit() {
    await this.client.quit();
  }

  async step() {
    await this.client.step({ count: 1 });

    this.state = await this.client.observation();

    if (this.ownerId === undefined) {
      this.ownerId = this.state.observation.rawData.units.find(unit => unit.unitType === UNIT_TYPE.nexus).owner;

      for (const player of this.gameInfo.playerInfo) {
        if (this.ownerId !== player.playerId) {
          this.enemyId = player.playerId;
          break;
        }
      }
    }
  }

  async chat(message) {
    await this.client.action({ actions: [{ actionChat: { channel: 1, message: message } }] });
  }

  time() {
    return this.state ? this.state.observation.gameLoop : 0;
  }

  minerals() {
    return this.state ? this.state.observation.playerCommon.minerals : 0;
  }

  workers() {
    return this.state ? this.state.observation.playerCommon.foodWorkers : 0;
  }

  energySupply() {
    return this.state ? this.state.observation.playerCommon.foodCap : 0;
  }

  energyUse() {
    return this.state ? this.state.observation.playerCommon.foodUsed : 0;
  }

  get(type) {
    if (!this.state) return;

    return this.state.observation.rawData.units.find(unit => (unit.unitType === UNIT_TYPE[type]) && (unit.owner === this.ownerId));
  }

  list(type) {
    if (!this.state) return [];

    return this.state.observation.rawData.units.filter(unit => (unit.unitType === UNIT_TYPE[type]) && (unit.owner === this.ownerId));
  }

  enemies() {
    return this.state.observation.rawData.units.filter(unit => (unit.owner === this.enemyId));
  }

  enemy(enemyTag) {
    if (!this.state) return;

    const one = this.state.observation.rawData.units.find(unit => (unit.tag === enemyTag));

    if (one) return one;

    const enemies = this.state.observation.rawData.units.filter(unit => (unit.owner === this.enemyId));
    const nexus = this.get("nexus");
    let nearestEnemy;
    let distanceToNearestEnemy = 1000;

    enemies.sort((a, b) => a.tag.localeCompare(b.tag));
    for (const enemy of enemies) {
      if (enemy.isFlying) continue;

      const distance = Math.abs(enemy.pos.x - nexus.pos.x) + Math.abs(enemy.pos.y - nexus.pos.y);
      if (distance < distanceToNearestEnemy) {
        nearestEnemy = enemy;
        distanceToNearestEnemy = distance;
      }
    }
    return nearestEnemy;
  }

  isBuilding() {
    const probes = this.list("probe");

    for (const probe of probes) {
      if (probe.orders.length === 2) {
        return true;
      }
    }

    return false;
  }

  async train(type, factory) {
    if (!this.state) return;

    if (type === "probe") {
      const nexus = this.get("nexus");

      await this.client.action({
        actions: [
          {
            actionRaw: {
              unitCommand: {
                unitTags: [nexus.tag],
                abilityId: 1006,
                queueCommand: false,
                target: {}
              }
            }
          }
        ]
      });
    } else if (type === "zealot") {
      await this.client.action({
        actions: [
          {
            actionRaw: {
              unitCommand: {
                unitTags: [factory],
                abilityId: 916,
                queueCommand: false,
                target: {}
              }
            }
          }
        ]
      });
    }
  }

  async build(type) {
    if (!this.state) return;

    if (type === "pylon") {
      const probe = this.get("probe");
      const nexus = this.get("nexus");
      const harvest = nexus.rallyTargets[0] ? nexus.rallyTargets[0].tag : this.get("mineral").tag;

      const STEP = 7;

      for (let distance = STEP; distance < 200; distance += STEP) {
        for (let x = nexus.pos.x - distance; x <= nexus.pos.x + distance; x += STEP) {
          for (let y = nexus.pos.y - distance; y <= nexus.pos.y + distance; y += STEP) {
            const response = await this.client.action({
              actions: [
                {
                  actionRaw: {
                    unitCommand: {
                      abilityId: 881, // Build pylon
                      unitTags: [probe.tag],
                      targetWorldSpacePos: { x: x, y: y },
                      queueCommand: false
                    }
                  }
                },
                {
                  actionRaw: {
                    unitCommand: {
                      abilityId: 298, // Go back to harvesting
                      unitTags: [probe.tag],
                      targetUnitTag: harvest,
                      queueCommand: true
                    }
                  }
                }
              ]
            });

            if (response.result[0] === 1) return;
          }
        }
      }
    } else if (type === "gateway") {
      const probe = this.get("probe");
      const pylons = this.list("pylon");
      const nexus = this.get("nexus");

      const STEP = 3.5;

      for (const pylon of pylons) {
        for (let x = pylon.pos.x - STEP; x <= pylon.pos.x + STEP; x += STEP) {
          for (let y = pylon.pos.y - STEP; y <= pylon.pos.y + STEP; y += STEP) {
            const response = await this.client.action({
              actions: [
                {
                  actionRaw: {
                    unitCommand: {
                      abilityId: 883, // Build gateway
                      unitTags: [probe.tag],
                      targetWorldSpacePos: { x: x, y: y },
                      queueCommand: false
                    }
                  }
                },
                {
                  actionRaw: {
                    unitCommand: {
                      abilityId: 298, // Go back to harvesting
                      unitTags: [probe.tag],
                      targetUnitTag: nexus.rallyTargets[0].tag,
                      queueCommand: true
                    }
                  }
                }
              ]
            });

            if (response.result[0] === 1) return;
          }
        }
      }
    }
  }

  async use(type, target, object) {
    if (!this.state) return;

    if (type === "chronoboost") {
      const nexus = this.get("nexus");

      await this.client.action({
        actions: [
          {
            actionRaw: {
              unitCommand: {
                unitTags: [nexus.tag],
                abilityId: 3755,
                targetUnitTag: target ? target : nexus.tag
              }
            }
          }
        ]
      });
    } else if (type === "attack") {
      await this.client.action({
        actions: [
          {
            actionRaw: {
              unitCommand: {
                unitTags: [target],
                abilityId: 3674,
                targetWorldSpacePos: { x: Math.random() * 250, y: Math.random() * 250 },
                queueCommand: false
              }
            }
          }
        ]
      });
    } else if (type === "test") {
      const distance = target.radius;
      const dx = distance * (Math.random() * 2 - 1);
      const dy = distance * (Math.random() * 2 - 1);
      await this.client.action({
        actions: [
          {
            actionRaw: {
              unitCommand: {
                unitTags: [target.tag],
                abilityId: 3674,
                targetWorldSpacePos: { x: target.pos.x + dx, y: target.pos.y + dy },
                queueCommand: false
              }
            }
          }
        ]
      });
    } else if (type === "test1") {
      await this.client.action({
        actions: [
          {
            actionRaw: {
              unitCommand: {
                unitTags: [target.tag],
                abilityId: 3674,
                targetUnitTag: object.tag,
                queueCommand: false
              }
            }
          }
        ]
      });
    } else if (type === "move") {
      await this.client.action({
        actions: [
          {
            actionRaw: {
              unitCommand: {
                unitTags: [target.tag],
                abilityId: 16,
                targetWorldSpacePos: { x: object.x, y: object.y },
                queueCommand: false
              }
            }
          }
        ]
      });
    }
  }

  async attack(unit, target) {
    await this.client.action({
      actions: [
        {
          actionRaw: {
            unitCommand: {
              unitTags: [unit],
              abilityId: 3674,
              targetUnitTag: target,
              queueCommand: false
            }
          }
        }
      ]
    });
  }

  async harvest(unit) {
    const nexus = this.get("nexus");

    if (!nexus) return;

    await this.client.action({
      actions: [
        {
          actionRaw: {
            unitCommand: {
              abilityId: 298, // Go back to harvesting
              unitTags: [unit],
              targetUnitTag: nexus.rallyTargets[0].tag,
              queueCommand: false
            }
          }
        }
      ]
    });
  }

}

function parseArguments(args) {
  const settings = {};

  if (args && args.length) {
    for (let i = 0; i < args.length - 1; i++) {
      if (args[i] === "--LadderServer") {
        settings.ladderServer = args[i + 1];
      } else if (args[i] === "--GamePort") {
        settings.gamePort = parseInt(args[i + 1]);
      } else if (args[i] === "--StartPort") {
        settings.startPort = parseInt(args[i + 1]);
      }
    }
  }

  return settings;
}

async function connect(client, settings) {
  try {
    await client.connect({
      host: settings.ladderServer || "localhost",
      port: settings.gamePort || 5000,
    });
  } catch (message) {
    if (!settings.ladderServer && (message.error.code === "ECONNREFUSED")) {
      await start(client);
    } else {
      throw error;
    }
  }
}

async function start(client) {
  log("Starting StarCraft II game...");

  spawn("..\\Versions\\Base88500\\SC2.exe", [
    "-displaymode", "0", "-windowx", "0", "-windowy", "0",
    "-windowwidth", "1920", "-windowwidth", "1440", // Alternatively, width: 1920 height: 1080/1200/1440 (1680/1050)
    "-listen", "127.0.0.1", "-port", "5000"
  ], {
    cwd: "C:\\games\\StarCraft II\\Support"
  });

  for (let i = 0; i < 12; i++) {
    try {
      await client.connect({ host: "localhost", port: 5000 });
      return;
    } catch (_) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  throw "Unable to start game!";
}

async function play(client, settings) {
  if (!settings.ladderServer) {
    await client.createGame({
      realtime: false,
      // localMap: { mapPath: "norman-defend-nexus.SC2Map" },
      battlenetMapName: "Data-C",
      playerSetup: [
        { type: 1, race: PROTOSS },            // Participant, Protoss
        { type: 2, race: 4, difficulty: 1 },   // Computer, Random
      ]
    });
  }

  const player = {};

  player.race = PROTOSS;
  player.options = { raw: true };

  if (settings.ladderServer) {
    let startPort = settings.startPort + 1;

    player.sharedPort = startPort++;
    player.serverPorts = { gamePort: startPort++, basePort: startPort++ };
    player.clientPorts = [
      { gamePort: startPort++, basePort: startPort++ },
      { gamePort: startPort++, basePort: startPort++ },
    ];
  };

  await client.joinGame(player);
}
