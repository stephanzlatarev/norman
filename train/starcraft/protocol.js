import starcraft from "@node-sc2/proto";
import { spawn } from "child_process";

export async function connect() {
  await game.connect();
}

export async function start() {
  await game.start();
}

export async function observe() {
  return game.nexus() ? [...game.probes(), ...game.drones()] : null;
}

export async function find(tag) {
  return game.find(tag);
}

export async function ability(unitTag, ability, x, y) {
  await game.command(unitTag, ability, x, y);
}

export async function command(unitTag, action) {
  if (!action) return;

  const unit = game.find(unitTag);
  if (!unit) return;

  const distance = unit.radius * 2;
  await game.command(unitTag, action.abilityId, unit.pos.x + action.x * distance, unit.pos.y + action.y * distance);
}

export async function step() {
  await game.step();
}

class Protocol {

  constructor() {
    this.client = starcraft();
  }

  async connect() {
    console.log("Connecting...");

    spawn("..\\Versions\\Base88500\\SC2.exe", [
      "-displaymode", "0", "-windowx", "0", "-windowy", "0",
      "-windowwidth", "1920", "-windowwidth", "1440", // Alternatively, width: 1920 height: 1080/1200/1440 (1680/1050)
      "-listen", "127.0.0.1", "-port", "5000"
    ], {
      cwd: "C:\\games\\StarCraft II\\Support"
    });

    for (let i = 0; i < 12; i++) {
      try {
        await this.client.connect({ host: "localhost", port: 5000 });
        console.log("Connected.");
        return;
      } catch (_) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    throw "Unable to start game!";
  }

  async start() {
    await this.client.createGame({
      realtime: false,
      localMap: { mapPath: "norman-defend-3x3.SC2Map" },
      playerSetup: [
        { type: 1, race: 3 },                  // Participant, Protoss
        { type: 2, race: 4, difficulty: 1 },   // Computer, Random
      ]
    });

    await this.client.joinGame({ race: 3, options: { raw: true } });

    this.gameInfo = await this.client.gameInfo();
  }

  async quit() {
    await this.client.quit();
  }

  async step() {
    await this.client.step({ count: 1 });

    this.state = await this.client.observation();

    if (this.ownerId === undefined) {
      this.ownerId = this.state.observation.rawData.units.find(unit => unit.unitType === 59).owner;

      for (const player of this.gameInfo.playerInfo) {
        if (this.ownerId !== player.playerId) {
          this.enemyId = player.playerId;
          break;
        }
      }
    }
  }

  find(unitTag) {
    if (!this.state) return null;

    return this.state.observation.rawData.units.find(unit => (unit.tag === unitTag));
  }

  nexus() {
    if (!this.state) return null;

    return this.state.observation.rawData.units.find(unit => (unit.unitType === 59) && (unit.owner === this.ownerId));
  }

  probes() {
    if (!this.state) return [];

    return this.state.observation.rawData.units.filter(unit => (unit.unitType === 84) && (unit.owner === this.ownerId));
  }

  drones() {
    if (!this.state) return [];

    return this.state.observation.rawData.units.filter(unit => (unit.owner === this.enemyId));
  }

  async command(unitTag, abilityId, x, y) {
    if (!this.state) return;

//    console.log("COMMAND:", unitTag, abilityId, x, y);
    await this.client.action({
      actions: [
        {
          actionRaw: {
            unitCommand: {
              unitTags: [unitTag],
              abilityId: abilityId,
              targetWorldSpacePos: { x: x, y: y },
              queueCommand: false
            }
          }
        }
      ]
    });
  }

}

const game = new Protocol();

export const protocol = game;
