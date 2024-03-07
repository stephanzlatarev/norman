import starcraft from "@node-sc2/proto";
import Depot from "./depot.js";
import Hub from "./hub.js";
import Job from "./job.js";
import Map from "./map.js";
import Mission from "./mission.js";
import Order from "./order.js";
import Types from "./types.js";
import Units from "./units.js";
import scheduleJobs from "./schedule.js";
import Count from "./memo/count.js";
import Enemy from "./memo/enemy.js";
import Resources from "./memo/resources.js";

const LOOPS_PER_STEP = 2;
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
      ...(this.observation.rawData.units.find(unit => (unit.unitType === 59)) || { pos: { x: 0, y: 0 } }).pos, // TODO: Replace with first building in Units
    };
    this.enemy = {
      id: gameInfo.playerInfo.find(player => (player.playerId !== this.me.id)).playerId,
      ...gameInfo.startRaw.startLocations[0],
    };

    Enemy.id = this.enemy.id;
    Enemy.base = { x: this.enemy.x, y: this.enemy.y };

    Types.sync((await this.client.data({ unitTypeId: true })).units);
    Units.sync(this.observation.rawData.units, this.me, this.enemy);
    Resources.sync(this.observation);

    Map.sync(gameInfo, this.me);
    await measureDistances(this.client, this.me);

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
        const observation = await this.client.observation();

        this.observation = observation.observation;

        Units.sync(this.observation.rawData.units, this.me, this.enemy);
        Resources.sync(this.observation);
        Count.sync();

        for (const job of Job.list()) {
          if (job.assignee && !job.assignee.isAlive) {
            job.close(false);
          }
        }

        for (const order of Order.list()) {
          order.confirm();
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
      const command = order.command();

      if (command) {
        orders.push(order);
        actions.push({ actionRaw: { unitCommand: command } });
      }
    }

    const response = await this.client.action({ actions: actions });

    for (let i = 0; i < response.result.length; i++) {
      orders[i].result(response.result[i]);
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

async function measureDistances(client, me) {
  const points = [];
  const mepos = { x: me.x, y: me.y };

  for (const hub of Hub.list()) {
    points.push({ startPos: mepos, endPos: { x: hub.x, y: hub.y } });
  }

  for (const depot of Depot.list()) {
    points.push({ startPos: mepos, endPos: { x: depot.harvestRally.x, y: depot.harvestRally.y } });
  }

  const pathing = (await client.query({ pathing: points })).pathing;

  let index = 0;

  for (const hub of Hub.list()) {
    hub.d = pathing[index++].distance;
  }
  Hub.order();

  for (const depot of Depot.list()) {
    depot.d = pathing[index++].distance;
  }
  Depot.order();
}
