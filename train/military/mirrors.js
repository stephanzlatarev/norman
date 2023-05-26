
const TEMPLATE_INPUT = []; for (let i = 0; i < 400; i++) TEMPLATE_INPUT.push(0);
const TEMPLATE_OUTPUT = []; for (let i = 0; i < 100; i++) TEMPLATE_OUTPUT.push(0);

const LENSES = [
  null,
  function(index) {
    const o = Math.floor(index / 100) * 100;
    let x = index % 10;
    let y = Math.floor((index - o) / 10);
    let s = x; x = y; y = s;
    return o + x + y * 10;
  },
  function(index) {
    const o = Math.floor(index / 100) * 100;
    let x = index % 10;
    let y = Math.floor((index - o) / 10);
    x = 9 - x; y = 9 - y;
    return o + x + y * 10;
  },
  function(index) {
    const o = Math.floor(index / 100) * 100;
    let x = index % 10;
    let y = Math.floor((index - o) / 10);
    let s = x; x = y; y = s;
    x = 9 - x; y = 9 - y;
    return o + x + y * 10;
  },
];

function mirror(samples, mirror) {
  if (!mirror) return samples;

  const result = [];

  for (const sample of samples) {
    const input = [...TEMPLATE_INPUT];
    const output = [...TEMPLATE_OUTPUT];

    for (let index = 0; index < input.length; index++) {
      input[index] = sample.input[mirror(index)];
    }

    for (let index = 0; index < output.length; index++) {
      output[index] = sample.output[mirror(index)];
    }

    result.push({ input: input, output: output });
  }

  return result;
}

const MIRRORS = [];

for (const lense of LENSES) {
  MIRRORS.push((samples) => mirror(samples, lense));
}

export default MIRRORS;
