import starcraft from "@node-sc2/proto";
import read from "./map/read.js";
import observe from "./observe/observe.js";
import act from "./act/act.js";
import Economy from "./economy/economy.js";
import { LOOPS_PER_STEP, LOOPS_PER_SECOND, WORKERS } from "./units.js";

const print = console.log;

export default class Game {

  constructor(model) {
    this.model = model;
  }

  async attach() {
    this.client = starcraft();

    await this.connect();

    const observation = (await this.client.observation()).observation;
    const base = observation.rawData.units.find(unit => (unit.unitType === 59));
    const map = read(this.model, await this.client.gameInfo(), observation, { x: base.pos.x, y: base.pos.y });

    this.economy = new Economy(this.client, map, base);

    setTimeout(this.run.bind(this));
  }

  clock() {
    const loop = this.model.observation ? this.model.observation.gameLoop : 0;
    const seconds = Math.floor(loop / LOOPS_PER_SECOND);
    const minutes = Math.floor(seconds / 60);
    return twodigits(minutes) + ":" + twodigits(seconds % 60) + "/" + loop;
  }

  async run() {
    console.log = function() { print(this.clock(), ...arguments); }.bind(this);

    try {
      const game = this.model.get("Game");
      const owner = game.get("owner");
      const enemy = this.model.get("Enemy").get("owner");

      while (this.client && !game.get("over")) {
        // Observe the current situation
        this.model.observation = (await this.client.observation()).observation;
        this.model.observation.ownUnits = this.model.observation.rawData.units.filter(unit => unit.owner === owner);
        this.model.observation.enemyUnits = this.model.observation.rawData.units.filter(unit => unit.owner === enemy);
        const images = observe(this.model, this.model.observation);
  
        // Let skills perform on current situation
        await this.model.memory.notifyPatternListeners();

        // Act on skills reaction
        await act(this.model, this.client, images);

        // Run the economy body system
        const time = this.model.observation.gameLoop;
        const units = new Map();
        const enemies = new Map();
        const resources = new Map();
        for (const unit of this.model.observation.rawData.units) {
          if (unit.owner === owner) {
            if (WORKERS[unit.unitType]) {
              unit.isBusy = !!this.model.get(unit.tag).get("isProducer");
            }
            units.set(unit.tag, unit);
          } else if (unit.owner === enemy) {
            enemies.set(unit.tag, unit);
          } else {
            resources.set(unit.tag, unit);
          }
        }
        await this.economy.run(time, this.model.observation, units, resources, enemies);
        for (const [tag, hasJob] of this.economy.jobs()) {
          const image = this.model.get(tag);
          if (image) {
            image.set("isWorker", hasJob);
          }
        }

        // Step in the game
        await this.client.step({ count: LOOPS_PER_STEP });
      }
    } catch (error) {
      console.log(error);
    } finally {
      console.log = print;
    }

    this.detach();
  }

  async detach() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (error) {
      }

      this.client = null;
    }
  }

}

function twodigits(value) {
  if (value < 10) return "0" + value;
  return value;
}
