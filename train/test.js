import Brain from "./brain.js";

async function run() {
  const INPUT_SIZE = 100;
  const OUTPUT_SIZE = 2;

  const brain = new Brain(INPUT_SIZE, OUTPUT_SIZE, 1000, 1);

  // TEACH
  console.log("=== Teaching...");
  const input = random(INPUT_SIZE);
  const output = random(OUTPUT_SIZE);
  brain.learn(input, output, 1);

  console.log("Learn:", JSON.stringify(output));

  // LEARN
  console.log("=== Learning...");
  for (let i = 0; i < 6; i++) {
    await brain.run(1000);

    console.log("Test:", JSON.stringify(await brain.answer(input)));
  }
}

function random(size) {
  const data = [];
  for (let i = 0; i < size; i++) data[i] = Math.random();
  return data;
}

run().catch(error => console.log("ERROR:", error));
