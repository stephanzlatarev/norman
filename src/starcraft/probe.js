import { angle, distance, dx, dy } from "./space.js";
import monitor from "./monitor.js";

const SENSOR_SHAPE = 32;
const NO_ACTION = [0.1, 0];
const PROBE_RANGES = [0, 1, 1000000];
const SPIN_FLIP = [0, 1, 8, 7, 6, 5, 4, 3, 2];
const SPIN_ROTA = [0, 8, 1, 2, 3, 4, 5, 6, 7];

// A body for a Protoss probe unit
export default class Probe {

  constructor(id) {
    this.id = id;
    this.spinning = 0;

    this.sensor = [];
    for (let i = 0 ; i < SENSOR_SHAPE; i++) {
      this.sensor.push(0);
    }

    this.motor = NO_ACTION;
  }

  situate(situation) {
    for (let i = 0 ; i < SENSOR_SHAPE; i++) {
      this.sensor[0] = 0;
    }

    let owner;
    let x;
    let y;

    for (const unit of situation) {
      if (unit.tag === this.id) {
        owner = unit.owner;
        x = unit.x;
        y = unit.y;
        break;
      }
    }
    
    for (const unit of situation) {
      if (unit.tag === this.id) continue;

      const dx = unit.x - x;
      const dy = unit.y - y;

      this.sensor[getSensorIndex(unit.owner - owner, distance(dx*dx+dy*dy, PROBE_RANGES), angle(dx, dy))] = 1;
    }

    return this.sensor;
  }

  // TODO: Fix spinning so that "this.spinning === 0" is only once after all angles and flips
  spin() {
    this.spinning++;

    // Rotate
    this.sensor = spin(this.sensor, SPIN_ROTA);
    this.motor[1] += 1/8;
    this.motor[1] %= 1;

    if ((this.spinning === 0) || (this.spinning === 8)) {
      if (this.spinning === 8) this.spinning = -8;

      // Flip
      this.sensor = spin(this.sensor, SPIN_FLIP);
      this.motor[1] = 1 - this.motor[1];
      this.motor[1] %= 1;
    }
  }

  // Returns the command that can be performed by the body
  toCommand() {
    if (this.motor[0] < 0.2) return null;

    return {
      abilityId: (this.motor[0] >= 0.6) ? 3674 : 16,
      x: dx(this.motor[1]),
      y: dy(this.motor[1]),
    };
  }

  print() {
    monitor(this.sensor, this.motor, PROBE_RANGES.length, getSensorIndex);
  }
}

function getSensorIndex(owner, distance, angle) {
  return (!owner ? 0 : SENSOR_SHAPE / 2) + (distance - 1) * 8 + (angle - 1);
}

function getSensorData(index) {
  return {
    owner: (index < SENSOR_SHAPE / 2) ? 0 : 1,
    distance: Math.floor((index % (SENSOR_SHAPE / 2)) / 8) + 1,
    angle: (index % 8) + 1,
  };
}

function spin(sensor, spin) {
  const result = [];

  for (let index = 0; index < SENSOR_SHAPE; index++) {
    const dot = getSensorData(index);

    result[index] = sensor[getSensorIndex(dot.owner, dot.distance, spin[dot.angle])];
  }

  return result;  
}
