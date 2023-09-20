
const NO_OBSTRUCTIONS = [Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity];

export default class Mobility {

  constructor(warrior) {
    this.warrior = warrior;
  }

  update(warriors, enemies, obstacles) {
    this.obstructions = [...NO_OBSTRUCTIONS];

    update(this, warriors);
    update(this, enemies);
    update(this, obstacles);
  }

  penalty(enemy) {
    const dir = direction(this.warrior, enemy);
    const dis = distance(this.warrior, enemy);

    return (dis > this.obstructions[dir]) ? 10 : 0;
  }

}

function update(mobility, units) {
  for (const unit of units) {
    const dir = direction(mobility.warrior, unit);
    const dis = distance(mobility.warrior, unit);

    if (dis < mobility.obstructions[dir]) {
      mobility.obstructions[dir] = dis;
    }
  }
}

function distance(a, b) {
  return Math.max(Math.abs(a.pos.x - b.pos.x), Math.abs(a.pos.y - b.pos.y));
}

function direction(a, b) {
  const x = a.pos.x - b.pos.x;
  const y = a.pos.y - b.pos.y;

  let d = 0;

  if (x >= 0) d += 1;
  if (y >= 0) d += 2;
  if (Math.abs(x) >= Math.abs(y)) d += 4;

  return d;
}
