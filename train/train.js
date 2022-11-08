import Brain from "./brain.js";
import { map, assign, pov, score } from "./starcraftGame.js";
import { connect, start, observe, find, command, step } from "./starcraftProtocol.js";
import Play from "./play.js";

const brain = new Brain(65*2, 2, 10, 50);
let isConnected = false;

export default async function() {
  const samples = [];
  let samplesScore;

  if (!isConnected) {
    await connect();
    isConnected = true;

    await new Play().go(brain);
    await learn(brain);
  }

  await start();
  await step();

  let context = await observe();
  let situation = map(context);

  const assignments = assign(situation);

  while (typeof(samplesScore) !== "number") {
    for (const bodyId in assignments) {
      if (!(await find(bodyId))) continue;

      const bodySituation = pov(situation, bodyId);
      const bodyAction = (assignments[bodyId] === "explorer") ? await brain.random(bodySituation) : await brain.answer(bodySituation);

      await command(bodyId, bodyAction);

      samples.push({ input: bodySituation, output: bodyAction });
    }

    await step();

    context = await observe();
    if (!context) {
      samplesScore = samplesScore || -1;
      break;
    }

    situation = map(context);
    samplesScore = score(context);
  }

  if (samplesScore > 0) {
    console.log("New sample set of size", samples.length, "and score", samplesScore);

    for (const sample of samples) {
      brain.learn(sample.input, sample.output, samplesScore);
    }
  }

  await learn(brain);
}

async function learn(brain) {
  for (let i = 0; i < 3; i++) {
    await brain.run(10000);
  }
}
