import starcraft from "@node-sc2/proto";
import read from "./map/read.js";
import observe from "./observe/observe.js";
import act from "./act/act.js";
import { LOOPS_PER_STEP, LOOPS_PER_SECOND } from "./units.js";

const print = console.log;

export default class Game {

  constructor(model) {
    this.model = model;
  }

  async attach() {
    this.client = starcraft();

    await this.connect();

    read(this.model, await this.client.gameInfo(), (await this.client.observation()).observation);

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
