
export default class Trace {

  static COLOR = {
    ATTACK: { r: 255, g: 0, b: 0 },
    MOVE: { r: 0, g: 255, b: 0 },
    COOLDOWN: { r: 100, g: 100, b: 255 },
  };

  constructor(speed) {
    this.speed = speed;
    this.lines = [];
    this.spheres = [];
    this.selection = null;
  }

  command(command, units) {
    const commandedUnitTag = command.unitTags[0];

    if (!this.selection) this.selection = getSelection(units);
    if (this.selection && !this.selection[commandedUnitTag]) return;

    if (command.abilityId === 3674) {
      const start = units.get(commandedUnitTag).body;
      const end = units.get(command.targetUnitTag).body;
      this.arrow(Trace.COLOR.ATTACK, start, end);
    }
  }

  arrow(color, start, end) {
    const dot = (start.x === end.x) && (start.y === end.y);
    for (let z = 8; z <= 9; z += 0.2) {
      this.lines.push({ line: { p0: { x: start.x, y: start.y, z: z }, p1: { x: end.x, y: end.y, z: dot ? 10 : z } }, color: color });
    }

    if ((color.r === 255) || (color.b === 255)) {
      this.spheres.push({ p: { x: end.x, y: end.y, z: 9 }, r: 0.2, color: { r: 200, g: 200, b: 200 } });
    }
  }

  async step(client) {
    await client.debug({ debug: [{ draw: { lines: this.lines, spheres: this.spheres } }] });

    await new Promise(resolve => setTimeout(resolve, this.speed));

    this.lines.length = 0;
    this.spheres.length = 0;
    this.selection = null;
  }

}

function getSelection(units) {
  const selection = {};
  let isSelected = false;

  for (const unit of units.values()) {
    if (unit.isSelected) {
      selection[unit.tag] = true;
      isSelected = true;
    }
  }

  return isSelected ? selection : false;
}
