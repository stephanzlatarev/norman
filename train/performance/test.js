import Brain from "../brain.js";
import Memory from "../memory.js";

const TENSOR = 200;
const SAMPLES = 1000;

async function go() {
  const body = { sensor: [], motor: [] };
  body.sensor.length = TENSOR;
  body.motor.length = TENSOR;

  const memory = new Memory(SAMPLES);
  const brain = new Brain(body, memory);

  for (let i = 0; i < SAMPLES; i++) {
    memory.add(brain.random(), brain.random());
  }

  console.log("Learning...");

  await brain.learn(1000);

  const samples = [];
  for (let i = 0; i < SAMPLES; i++) {
    samples.push(brain.random());
  }

  console.log("Performing...");

  const time = Date.now();

  await brain.reactMany(samples);

  const millis = Date.now() - time;
  const performance = samples.length / millis;

  console.log(
    samples.length, "samples",
    millis, "millis",
    performance.toFixed(2), "samples per millisecond"
  );
}

go();
