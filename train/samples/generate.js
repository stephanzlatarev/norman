// TODO: Take as argument the game ("starcraft") and scenario ("probes-3x3")
// TODO: Use a gherkin skill file and translate the scenarios to samples

import fs from "fs";
import Probe from "../starcraft/probe.js";
import { dx, dy } from "../starcraft/space.js";

export default async function() {
  const samples = [];

  // When enemy is far away Then approach it
  addSample(samples, [], [{ angle: 1, distance: 2 }], false, 1);
  addSample(samples, [], [{ angle: 1, distance: 2 }, { angle: 2, distance: 2 }], false, 1);
  addSample(samples, [], [{ angle: 1, distance: 2 }, { angle: 2, distance: 2 }, { angle: 8, distance: 2 }], false, 1);
  addSample(samples, [], [{ angle: 2, distance: 2 }, { angle: 8, distance: 2 }], false, 1);
  addSample(samples, [{ angle: 1, distance: 2 }], [{ angle: 1, distance: 2 }, { angle: 2, distance: 2 }], false, 1);
  addSample(samples, [{ angle: 1, distance: 2 }], [{ angle: 1, distance: 2 }], false, 1);
  addSample(samples, [{ angle: 1, distance: 2 }, { angle: 2, distance: 2 }], [{ angle: 1, distance: 2 }], false, 1);

  // When enemy is in reach Then attack
  addSample(samples, [], [{ angle: 1, distance: 1 }], true, 1);

  // When two enemies are in reach And there is support for one Then attack it
  for (const distance of [1, 2]) {
    for (const angle of [1, 2, 3, 4, 5]) {
      addSample(samples, [{ angle: angle, distance: distance }], [{ angle: 1, distance: 1 }, { angle: angle, distance: 1 }], true, angle);
    }
    addSample(samples, [{ angle: 3, distance: distance }], [{ angle: 1, distance: 1 }, { angle: 2, distance: 1 }], true, 2);
  }
  
  // When enemy is surrounded Then attack
  for (const distance of [1, 2]) {
    addSample(samples, [{ angle: 2, distance: 1 }, { angle: 8, distance: 1 }], [{ angle: 1, distance: distance }], (distance === 1), 1);
  }
  for (const angle of [8, 1, 2]) {
    addSample(samples, [{ angle: angle, distance: 2 }], [{ angle: 1, distance: 1 }], true, 1);
  }

  // When wing is behind Then move back
  for (const angle of [4, 5]) {
    addSample(samples, [{ angle: angle, distance: 1 }], [{ angle: 1, distance: 2 }], false, 5);
    addSample(samples, [{ angle: angle, distance: 2 }], [{ angle: 1, distance: 2 }], false, 5);
  }
  addSample(samples, [{ angle: 5, distance: 2 }, { angle: 4, distance: 2 }], [{ angle: 1, distance: 2 }], false, 5);
  addSample(samples, [{ angle: 6, distance: 2 }, { angle: 4, distance: 2 }], [{ angle: 1, distance: 2 }], false, 5);
  addSample(samples, [{ angle: 3, distance: 2 }, { angle: 7, distance: 2 }], [{ angle: 1, distance: 2 }], false, 5);

  // When wing is to one side Then move to the other side
  addSample(samples, [{ angle: 2, distance: 1 }], [{ angle: 1, distance: 2 }], false, 8);
  addSample(samples, [{ angle: 2, distance: 2 }], [{ angle: 1, distance: 2 }], false, 1);
  addSample(samples, [{ angle: 3, distance: 1 }], [{ angle: 1, distance: 2 }], false, 1);
  addSample(samples, [{ angle: 3, distance: 2 }], [{ angle: 1, distance: 2 }], false, 1);
  addSample(samples, [{ angle: 3, distance: 2 },{ angle: 2, distance: 2 }], [{ angle: 1, distance: 2 }], false, 8);

  fs.writeFileSync("./train/sandbox/samples/probe.json", "[\r\n" + samples.join(",\r\n") + "\r\n]");
}

function addSample(samples, wings, enemies, commandAttack, commandAngle) {
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
  probe.motor = [commandAttack ? 0.8 : 0.4, (commandAngle - 1) / 8];

  do {
    samples.push(JSON.stringify({ sensor: probe.sensor, motor: probe.motor }));

    probe.spin();
  } while (probe.spinning);
}
