import starcraft from "@node-sc2/proto";
import Job from "./job.js";
import Mission from "./mission.js";
import Order from "./order.js";
import scheduleJobs from "./schedule.js";
import Types from "./types.js";
import Units from "./units.js";
import Board from "./map/board.js";
import Depot from "./map/depot.js";
import { createMap, syncMap } from "./map/sync.js";
import countUnits from "./memo/count.js";
import countEncounters from "./memo/encounters.js";
import Enemy from "./memo/enemy.js";
import Resources from "./memo/resources.js";
import Score from "./memo/score.js";
import Zone from "./map/zone.js";

const LOOPS_PER_STEP = 1;
const LOOPS_PER_SECOND = 22.4;
const LOOPS_PER_MINUTE = LOOPS_PER_SECOND * 60;

const print = console.log;

export default class Game {

  async attach() {
    this.client = starcraft();

    await this.connect();

    const gameInfo = await this.client.gameInfo();
    const observation = await this.client.observation();

    this.observation = observation.observation;
    this.me = {
      id: this.observation.playerCommon.playerId,
      race: getRace(gameInfo, this.observation.playerCommon.playerId),
      ...(this.observation.rawData.units.find(unit => (unit.unitType === 59)) || { pos: { x: 0, y: 0 } }).pos, // TODO: Replace with first building in Units
    };

    Types.sync((await this.client.data({ unitTypeId: true, upgradeId: true })));
    Units.sync(this.observation.rawData.units, null, this.me);
    Resources.sync(this.observation);
    Score.sync(this.observation);

    createMap(gameInfo);

    for (const location of gameInfo.startRaw.startLocations) {
      const base = [...Depot.list()].find(depot => ((depot.x === location.x) && (depot.y === location.y)));

      if (base) {
        Enemy.base = base;
        break;
      }
    }

    console.log = function() { const prefix = this.clock(); if (prefix) { print(prefix, ...arguments); } else { print(...arguments); } }.bind(this);
  }

  clock() {
    if (this.observation && this.observation.gameLoop) {
      const loop = this.observation.gameLoop;
      const minutes = Math.floor(loop / LOOPS_PER_MINUTE);
      const seconds = Math.floor(loop / LOOPS_PER_SECOND) % 60;
      const mm = (minutes >= 10) ? minutes : "0" + minutes;
      const ss = (seconds >= 10) ? seconds : "0" + seconds;

      return `${mm}:${ss}/${loop}`;
    }
  }

  async observe() {
    if (!this.client) return;

    const gameInfo = await this.client.gameInfo();
    const observation = await this.client.observation();

    this.observation = observation.observation;

    syncMap(gameInfo);

    Resources.sync(this.observation);
    Score.sync(this.observation);
    Units.sync(this.observation.rawData.units, this.observation.rawData.event, this.me);

    countUnits(this.observation, this.me.race);
    countEncounters();

    for (const zone of Zone.list()) {
      zone.clearEffects();
    }
    for (const effect of this.observation.rawData.effects) {
      for (const pos of effect.pos) {
        const zone = Board.zone(pos.x, pos.y);
        if (zone) zone.addEffect({ x: pos.x, y: pos.y, effect: effect.effectId, owner: effect.owner, radius: effect.radius });
      }
    }

    for (const job of Job.list()) {
      if (job.assignee && !job.assignee.isAlive) {
        console.log(job.assignee.type.name, job.assignee.nick, "died on job", job.details);
        job.close(false);
      }
    }

    for (const order of Order.list()) {
      order.check();
    }
  }

  async act() {
    if (!this.client) return;

    for (const mission of Mission.list()) {
      mission.run();
    }

    scheduleJobs();

    await this.executeOrders();

    for (const job of Job.list()) {
      if (job.order && job.order.isAccepted && job.assignee && !job.assignee.order.abilityId) {
        console.log("WARNING! Unit", job.assignee.type.name, job.assignee.nick, "idle on job", job.details);
        job.close(false);
      }
    }

    if ((Resources.loop > 2) && !this.hasGreetedOpponent) {
      await greet(this, Enemy.OPPONENT_ID);
      this.hasGreetedOpponent = true;
    }

    if (Units.buildings().size) {
      await this.step();
    } else {
      await this.say("gg");
      await this.detach();
    }
  }

  async step() {
    await this.client.step({ count: LOOPS_PER_STEP });
  }

  async executeOrders() {
    const orders = [];
    const actions = [];

    for (const order of Order.list()) {
      let o = order;

      while (o) {
        const command = o.command();

        if (command) {
          command.queueCommand = (o !== order);

          orders.push(o);
          actions.push({ actionRaw: { unitCommand: command } });
        }

        o = o.next;
      }
    }

    if (actions.length) {
      // if (actions.length > 99) {
      //   console.log("WARNING: Reducing orders from", actions.length, "to 99. Skipping:", JSON.stringify(actions.slice(99)));
      //   actions.length = 99;
      // }

      try {
        const response = await this.client.action({ actions: actions });

        for (let i = 0; i < response.result.length; i++) {
          orders[i].result(response.result[i]);
        }

        console.log("Executed", String(actions.length).padStart(3, "0"), "orders:", JSON.stringify(actions));
        console.log("Received", String(response.result.length).padStart(3, "0"), "results:", JSON.stringify(response.result));
      } catch (error) {
        console.log("ERROR: Failed to execute", actions.length, "orders");
        console.log(JSON.stringify(actions));
        console.log(error);
      }
    }
  }

  async say(message) {
    await this.client.action({ actions: [{ actionChat: { channel: 1, message: message } }] });
  }

  async detach() {
    console.log = print;

    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

}

async function greet(game, enemyId) {
  const gameInfo = await game.client.gameInfo();

  for (const playerInfo of gameInfo.playerInfo) {
    if (playerInfo.playerName && playerInfo.playerName.length && (playerInfo.playerId === enemyId)) {
      return await game.say("Good luck, " + playerInfo.playerName + "! Have fun.");
    }
  }

  await game.say("Good luck, stranger! Have fun.");
}

function getRace(gameInfo, playerId) {
  for (const playerInfo of gameInfo.playerInfo) {
    if (playerInfo.playerId === playerId) {
      return playerInfo.raceActual;
    }
  }
}
