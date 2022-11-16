import fs from "fs";
import Brain from "./brain.js";
import Memory from "./memory.js";
import Probe from "./starcraft/probe.js";
import { dx, dy } from "./starcraft/space.js";

let drilling = false;

export default async function(skill) {
  if (!skill) return;

  init();

  const probe = new Probe();
  const memory = new Memory(10000, 0);
  const brain = new Brain(probe, memory, "./train/sandbox/brain/" + skill);

  const examples = JSON.parse(fs.readFileSync("./train/sandbox/skill/" + skill + ".json").toString()).examples;
  const samples = readSamples(examples);

  const etalon = spin(samples);
  const fixedSamples = fix(etalon);

  console.log();
  console.log(" === SAMPLES TO LEARN ===");
  for (const sample of samples) {
    const probe = new Probe();
    probe.sensor = sample.sensor;
    probe.motor = sample.motor;
    console.log(" === ", sample.motor);
    probe.print();
  }
  console.log();

  // Drill with fixed samples
  memory.clear({ informAboutCollisions: true });
  addToMemory(memory, spin(fix(samples)));
  await brain.learn(3000);

  while (drilling) {
    memory.clear();

    addToMemory(memory, fixedSamples);

    const randomEtalon = canon(etalon, vary(etalon, 20));
    addToMemory(memory, randomEtalon);

    const randomRandom = canon(etalon, random(etalon, 100));
    addToMemory(memory, randomRandom);

    await brain.learn(5000);

    // Measure success rate
    const successRateSamples = await measureSamples(brain, etalon, samples);
    const successRateEtalons = await measureEtalons(brain, etalon);
    const successRateRandoms = await measureRandoms(brain, etalon);
    console.log(`Success rate is ${successRateSamples}% for ${fixedSamples.length} samples,` +
        ` ${successRateEtalons}% for ${randomEtalon.length} etalon, and ${successRateRandoms}% for ${randomRandom.length} randoms`);
  }
}

function init() {
  drilling = true;

  process.stdin.on("keypress", (_, key) => {
    if (key.name === "escape") {
      drilling = false;
    }
  });
  console.log("Press Esc to leave");
}

function readSamples(examples) {
  const list = [];

  for (const example of examples) {
    list.push({
      sensor: readSensor(example.situation),
      motor: readMotor(example.action),
      level: list.length,
    });
  }

  return list;
}

function readSensor(units) {
  const friends = readSituation(units, 0, "friend");
  const enemies = readSituation(units, 1, "enemy");
  const emptyFriendly = readSituation(units, 0, "empty");
  const emptyEnemy = readSituation(units, 1, "empty");
  const sensor = [...friends];

  // Make wild cards
  for (let i = 0; i < sensor.length; i++) sensor[i] = -1;

  // Mark friendly units
  for (let i = 0; i < sensor.length; i++) if (friends[i]) sensor[i] = 1;

  // Mark enemy units
  for (let i = 0; i < sensor.length; i++) if (enemies[i]) sensor[i] = 1;

  // Mark empties
  for (let i = 0; i < sensor.length; i++) if (emptyFriendly[i]) sensor[i] = 0;
  for (let i = 0; i < sensor.length; i++) if (emptyEnemy[i]) sensor[i] = 0;

  return sensor;
}

function readSituation(units, owner, type) {
  const probe = new Probe("self");
  const situation = [{ tag: "self", owner: 0, x: 100, y: 100 }];

  for (const unit of units) {
    if (unit.unit === type) {
      const distance = (unit.distance === 1) ? 1 : 100;
      situation.push({
        owner: owner,
        x: 100 + dx((unit.direction - 1) / 8) * distance,
        y: 100 + dy((unit.direction - 1) / 8) * distance,
      });
    }
  }

  probe.situate(situation);

  return probe.sensor;
}

function readMotor(action) {
  if (action.skill === "attack") return [0.8, 0];
  if (action.skill === "flank") return [0.6, 0];
  if (action.skill === "support") return [0.4, 0];
  if (action.skill === "spread") return [0.2, 0];
  if (action.ability === "attack") return [0.8, (action.direction - 1) / 8];
  if (action.ability === "move") return [0.4, (action.direction - 1) / 8];
  return [0, 0];
}

function addToMemory(memory, samples) {
  for (const sample of samples) {
    memory.add(sample.sensor, sample.motor, 1);
  }
}

function fix(samples) {
  const list = [];

  for (const sample of samples) {
    const sampleSensor = [...sample.sensor];
    const sampleMotor = [...sample.motor];

    for (let i = 0; i < sampleSensor.length; i++) {
      if (sampleSensor[i] < 0) {
        sampleSensor[i] = 0;
      }
    }

    list.push({ sensor: sampleSensor, motor: sampleMotor });
  }

  return list;
}

function vary(samples, multiplier) {
  const list = [];

  for (const sample of samples) {
    for (let i = 0; i < multiplier; i++) {
      const sampleSensor = [...sample.sensor];
      const sampleMotor = [...sample.motor];

      for (let i = 0; i < sampleSensor.length; i++) {
        if (sampleSensor[i] < 0) {
          sampleSensor[i] = Math.floor(Math.random() * 2);
        }
      }

      list.push({ sensor: sampleSensor, motor: sampleMotor });
    }
  }

  return list;
}

function spin(samples) {
  const list = [];

  for (const sample of samples) {
    const probe = new Probe();

    probe.sensor = [...sample.sensor];
    probe.motor = [...sample.motor];

    do {
      list.push({ sensor: [...probe.sensor], motor: [...probe.motor] });
      probe.spin();
    } while (probe.spinning);
  }

  return list;
}

function canon(etalon, samples) {
  const list = [];

  for (const sample of samples) {
    list.push({
      sensor: sample.sensor,
      motor: findEtalon(sample.sensor, etalon).motor,
    });
  }

  return list;
}

function random(etalon, number) {
  const randoms = [];

  for (let i = 0; i < number; i++) {
    const sensor = [...etalon[0].sensor];

    for (let i = 0; i < sensor.length; i++) sensor[i] = Math.floor(Math.random() * 2);

    randoms.push({ sensor: sensor });
  }

  return randoms;
}

async function measureSamples(brain, etalon, samples) {
  return await testVariations(brain, etalon, spin(fix(samples)), true);
}

async function measureEtalons(brain, etalon) {
  return await testVariations(brain, etalon, vary(etalon, 100), true);
}

async function measureRandoms(brain, etalon) {
  return await testVariations(brain, etalon, random(etalon, 1000));
}

async function testVariations(brain, etalon, variations, explain) {
  let good = 0;
  let bad = 0;
  let hasExplained = false;

  for (const test of variations) {
    const actual = await brain.react(test.sensor);
    const expected = findEtalon(test.sensor, etalon).motor;
    const ok = (Math.abs(actual[0] - expected[0]) < 0.1) && (Math.abs(actual[1] - expected[1]) < 0.1);

    if (ok) {
      good++;
    } else {
      bad++;

      if (explain && !hasExplained) {
        console.log();

        for (const sample of etalon) {
          const match = isSensorMatching(test.sensor, sample.sensor);
          if (match) {
            printReaction("Expected", sample.sensor, sample.motor);
            break;
          }
        }

        printReaction("Actual", test.sensor, actual);

        console.log();
        hasExplained = true;
      }
    }
  }

  return (good * 100 / (good + bad)).toFixed(2);
}

function printReaction(label, sensor, motor) {
  console.log(label + ":", JSON.stringify(motor), JSON.stringify(sensor));

  const probe = new Probe();
  probe.sensor = sensor;
  probe.motor = motor;
  probe.print();
}

function findEtalon(sensor, etalon) {
  for (const sample of etalon) {
    if (isSensorMatching(sensor, sample.sensor)) return sample;
  }

  return etalon[etalon.length - 1];
}

function isSensorMatching(sampleSensor, etalonSensor) {
  for (let i = 0; i < etalonSensor.length; i++) {
    if ((etalonSensor[i] >= 0) && (sampleSensor[i] !== etalonSensor[i])) return false;
  }

  return true;
}
