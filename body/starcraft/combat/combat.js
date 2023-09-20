import attack from "./attack.js";
import move from "./move.js";
import Unit from "./unit.js";
import debug from "./debug.js";

export default class Combat {

  constructor(client) {
    this.client = client;
    this.warriors = [];
    this.enemies = [];
    this.obstacles = [];
    this.knowns = new Set();

    debug.use(client);
  }

  async run(warriors, enemies, obstacles) {
    sync("warrior", this.warriors, warriors, this.knowns);
    sync("enemy", this.enemies, enemies, this.knowns);
    sync("obstacle", this.obstacles, obstacles, this.knowns);

    await attack(this);
    await move(this);

    await debug.show();
  }

  async command(command) {
    const response = await this.client.action({ actions: [{ actionRaw: { unitCommand: command } }] });

    if (!response || !response.result || (response.result.length !== 1) || (response.result[0] !== 1)) {
      console.log("combat", JSON.stringify(command), ">>", JSON.stringify(response));
      return false;
    }

    return true;
  }

}

function sync(type, imageUnits, observedUnits, knowns) {
  for (let i = imageUnits.length - 1; i >= 0; i--) {
    const unit = imageUnits[i];

    if (!unit.sync(observedUnits)) {
      imageUnits.splice(i, 1);
      knowns.delete(unit.tag);
    }
  }

  if (imageUnits.length !== observedUnits.size) {
    for (const [tag, unit] of observedUnits) {
      if (!knowns.has(tag)) {
        imageUnits.push(new Unit(unit, type));
        knowns.add(tag);
      }
    }
  }
}
