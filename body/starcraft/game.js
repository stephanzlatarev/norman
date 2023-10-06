import starcraft from "@node-sc2/proto";
import read from "./map/read.js";
import observe from "./observe/observe.js";
import act from "./act/act.js";
import Combat from "./combat/combat.js";
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
    const base = observation.rawData.units.find(unit => (unit.unitType === 59)) || { pos: { x: 0, y: 0 } };
    const map = read(this.model, await this.client.gameInfo(), observation, { x: base.pos.x, y: base.pos.y });

    this.units = new Map();
    this.combat = new Combat();
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

        const time = this.model.observation.gameLoop;
        const units = new Map();
        const enemies = new Map();
        const resources = new Map();
        const alive = new Map();
        for (const unit of this.model.observation.rawData.units) {
          sync(unit, this.units);
          alive.set(unit.tag, true);

          if (unit.owner === owner) {
            if (this.model.unitImages && WORKERS[unit.unitType]) {
              const image = this.model.unitImages[unit.tag];
              unit.isBusy = image ? !!image.get("isProducer") : false;
            } else {
              unit.isBusy = false;
            }

            units.set(unit.tag, unit);
          } else if (unit.owner === enemy) {
            enemies.set(unit.tag, unit);
          } else {
            resources.set(unit.tag, unit);
          }
        }

        // Remove dead units
        for (const tag of this.units.keys()) {
          if (!alive.get(tag)) {
            this.units.delete(tag);
          }
        }

        // Run the economy body system
        await this.economy.run(time, this.model.observation, units, resources, enemies);
        for (const [tag, hasJob] of this.economy.jobs()) {
          const image = this.model.get(tag);
          if (image) {
            image.set("isWorker", hasJob);
          }
        }

        // Run the combat body system
        await this.command(this.combat.run(this.units));

        // Step in the game
        await this.step();
      }
    } catch (error) {
      console.log(error);
    } finally {
      console.log = print;
    }

    this.detach();
  }

  async step() {
    await this.client.step({ count: LOOPS_PER_STEP });
  }

  async command(commands) {
    const actions = commands.map(command => ({ actionRaw: { unitCommand: command } }));
    const response = await this.client.action({ actions: actions });

    for (let i = 0; i < response.result.length; i++) {
      const result = response.result[i];

      if (result !== 1) {
        console.log(JSON.stringify(commands[i]), ">>", result);
      }
    }
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

function sync(unit, units) {
  let image = units.get(unit.tag);

  if (image) {
    image.pos = unit.pos;
    image.order = unit.orders.length ? unit.orders[0] : { abilityId: 0 };
    image.health = unit.health;
    image.shield = unit.shield;
  } else {
    units.set(unit.tag, {
      tag: unit.tag,
      kind: { damage: (unit.unitType === 73) },
      owner: unit.owner,
      pos: unit.pos,
      order: unit.orders.length ? unit.orders[0] : { abilityId: 0 },
      radius: unit.radius,
      health: unit.health,
      shield: unit.shield,
    });
  }
}

function twodigits(value) {
  if (value < 10) return "0" + value;
  return value;
}
