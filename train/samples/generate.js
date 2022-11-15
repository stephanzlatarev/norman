// TODO: Take as argument the game ("starcraft") and scenario ("probes-3x3")
// TODO: Use a gherkin skill file and translate the scenarios to samples

import fs from "fs";
import Probe from "../starcraft/probe.js";
import { dx, dy } from "../starcraft/space.js";

const IDLE = [0, 0];

export default async function() {
  save("fight", fight());
  save("attack", attack());
  save("flank", flank());
  save("support", support());
}

function fight() {
  const samples = [];

  const emptyField = sensor([], []);
  const closeDrone = sensor([], [{ angle: 1, distance: 1 }]);
  const closeProbe = sensor([{ angle: 1, distance: 1 }], []);

  sample(samples, closeDrone, [], [0.8, 0]);                       // attack
  sample(samples, closeProbe, [closeDrone], [0.4, 0]);             // flank
  sample(samples, emptyField, [closeDrone, closeProbe], [0.0, 0]); // support

  return samples;
}

function attack() {
  const samples = [];

  const emptyField = sensor([], []);
  const positive = sensor([], [{ angle: 1, distance: 1 }]);
  const negative = [
    sensor([], [{ angle: 1, distance: 2 }]),
    sensor([{ angle: 1, distance: 1 }], []),
    sensor([{ angle: 1, distance: 2 }], []),
  ];

  sample(samples, positive, negative, motor(true, 1));
  sample(samples, emptyField, [positive], IDLE);

  return samples;
}

function flank() {
  const samples = [];

  for (const angle of [1, 2, 3, 4, 5]) {
    sample(samples, sensor([{ angle: angle, distance: 1 }], [{ angle: 1, distance: 2 }]), [], motor(false, 8), sensor([{ angle: 8, distance: 1 }], []));
  }

  return samples;
}

function support() {
  const samples = [];

  const emptyField = sensor([], []);
  const positive = sensor([{ angle: 1, distance: 2 }], []);

  sample(samples, positive, [], motor(false, 1));
  sample(samples, emptyField, [positive], IDLE);

  return samples;
}

function sensor(wings, enemies) {
  const probe = new Probe("self");
  const units = [{ tag: "self", owner: 0, x: 0, y: 0 }];

  for (const unit of wings) {
    const distance = (unit.distance === 1) ? 0.1 : 10;
    const direction = (unit.angle - 1) / 8;
    units.push({ owner: 0, x: dx(direction) * distance, y: dy(direction) * distance});
  }

  for (const unit of enemies) {
    const distance = (unit.distance === 1) ? 0.1 : 10;
    const direction = (unit.angle - 1) / 8;
    units.push({ owner: 1, x: dx(direction) * distance, y: dy(direction) * distance});
  }

  probe.situate(units);

  return probe.sensor;
}

function motor(attack, angle) {
  return [attack ? 0.8 : 0.4, (angle - 1) / 8];
}

function sample(samples, sensor, masks, motor, empty) {
  // Make all empy slots in the sensor to be wild cards
  for (let i = 0; i < sensor.length; i++) if (sensor[i] === 0) sensor[i] = -1;

  if (empty) for (let i = 0; i < sensor.length; i++) if (empty[i] === 1) sensor[i] = 0;

  // Make all full slots in the masks as fixed empty slots
  for (const mask of masks) {
    const probe = new Probe();
    probe.sensor = mask;

    do {
      for (let i = 0; i < sensor.length; i++) if (probe.sensor[i] === 1) {
        if (sensor[i] === -1) {
          sensor[i] = 0;
        } else if (sensor[i] === 1) {
          throw "Clash " + JSON.stringify(mask) + " and " + JSON.stringify(sensor);
        }
      }

      probe.spin();
    } while (probe.spinning);
  }

  samples.push(JSON.stringify({ sensor: sensor, motor: motor }));
}

function save(skill, samples) {
  fs.writeFileSync("./train/sandbox/samples/" + skill + ".json", "[\r\n" + samples.join(",\r\n") + "\r\n]");
}
