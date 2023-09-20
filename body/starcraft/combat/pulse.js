
const MAX_RADIUS = Math.sqrt(256 * 256);

export default class Pulse {

  constructor(unit, accept, charge, radius) {
    this.unit = unit;
    this.accept = accept;
    this.charge = charge;
    this.radius = radius;
  }

  measure(unit, pos) {
    if ((this.unit === unit) || !this.accept(unit)) return 0;

    const d = distance(this, unit, pos);
    const r = radius(this, unit);

    if (d <= r) {
      return this.charge - (this.charge * d / r);
    }

    return 0;
  }

}

function radius(pulse, unit) {
  if (pulse.radius > 0) {
    return pulse.radius;
  } else if (pulse.radius) {
    return pulse.radius(unit);
  } else {
    return MAX_RADIUS;
  }
}

function distance(pulse, unit, pos) {
  const x1 = pulse.unit.pos.x;
  const x2 = pos.x;
  const y1 = pulse.unit.pos.y;
  const y2 = pos.y;

  let distance = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));

  if (pulse.unit.radius > 0) {
    distance -= pulse.unit.radius;
  }

  if (unit.radius > 0) {
    distance -= unit.radius;
  }

  return (distance > 0) ? distance : 0;
}
