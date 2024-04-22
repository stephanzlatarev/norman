import starcraft from "@node-sc2/proto";
import Job from "./job.js";
import Mission from "./mission.js";
import Order from "./order.js";
import Types from "./types.js";
import Units from "./units.js";
import Map from "./map/map.js";
import Count from "./memo/count.js";
import Enemy from "./memo/enemy.js";
import Resources from "./memo/resources.js";
import scheduleJobs from "./schedule/schedule.js";

const LOOPS_PER_STEP = 1;
const LOOPS_PER_SECOND = 22.4;
const LOOPS_PER_MINUTE = LOOPS_PER_SECOND * 60;

const print = console.log;

export default class Game {

  async attach(endCallback) {
    this.endCallback = endCallback;
    this.client = starcraft();

    await this.connect();
    await this.say("Good luck!");

    const gameInfo = await this.client.gameInfo();
    const observation = await this.client.observation();

    this.observation = observation.observation;
    this.me = {
      id: this.observation.playerCommon.playerId,
      race: getRace(gameInfo, this.observation.playerCommon.playerId),
      ...(this.observation.rawData.units.find(unit => (unit.unitType === 59)) || { pos: { x: 0, y: 0 } }).pos, // TODO: Replace with first building in Units
    };
    this.enemy = {
      id: gameInfo.playerInfo.find(player => (player.playerId !== this.me.id)).playerId,
      ...gameInfo.startRaw.startLocations[0],
    };

    Enemy.id = this.enemy.id;
    Enemy.base = { x: this.enemy.x, y: this.enemy.y };

    Types.sync((await this.client.data({ unitTypeId: true, upgradeId: true })));
    Units.sync(this.observation.rawData.units, this.me, this.enemy);
    Resources.sync(this.observation);

    Map.create(gameInfo);

    setTimeout(this.run.bind(this));

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

  async run() {
    try {
      while (this.client) {
        const gameInfo = await this.client.gameInfo();
        const observation = await this.client.observation();

        this.observation = observation.observation;

        Map.sync(gameInfo, this.observation.gameLoop);
        Units.sync(this.observation.rawData.units, this.me, this.enemy);
        Resources.sync(this.observation);
        Count(this.observation, this.me.race);

        for (const job of Job.list()) {
          if (job.assignee && !job.assignee.isAlive) {
            job.close(false);
          }
        }

        for (const order of Order.list()) {
          order.check();
        }

        for (const mission of Mission.list()) {
          mission.run();
        }

        scheduleJobs();

        await this.executeOrders();

        if (Units.workers().size && Units.buildings().size) {
          await this.step();
        } else {
          await this.say("gg");
          break;
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      console.log = print;
    }

    this.endCallback();
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
      const response = await this.client.action({ actions: actions });

      for (let i = 0; i < response.result.length; i++) {
        orders[i].result(response.result[i]);
      }
    }
  }

  async say(message) {
    await this.client.action({ actions: [{ actionChat: { channel: 1, message: message } }] });
  }

  async detach() {
    console.log = print;

    if (this.client) {
      try {
        await this.client.quit();
      } catch (error) {
      }
    }
  }

}

function getRace(gameInfo, playerId) {
  for (const playerInfo of gameInfo.playerInfo) {
    if (playerInfo.playerId === playerId) {
      return playerInfo.raceActual;
    }
  }
}
