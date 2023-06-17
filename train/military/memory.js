import fs from "fs";

export default class Memory {

  constructor(limit) {
    this.limit = limit;
    this.clear();
  }

  add(samples) {
    if (!samples) return;

    let additions = 0;

    for (const sample of samples) {
      const hash = JSON.stringify(sample.input);
      const index = this.hash[hash];

      if (index >= 0) {
        this.input[index] = sample.input;
        this.output[index] = sample.output;
      } else {
        this.hash[hash] = this.input.length;
        this.input.push(sample.input);
        this.output.push(sample.output);

        additions++;
      }
    }

    if (this.input.length > this.limit) {
      for (let i = this.limit; i < this.input.length; i++) delete this.hash[JSON.stringify(this.input[i])];

      this.input.splice(0, this.input.length - this.limit);
      this.output.splice(0, this.output.length - this.limit);
    }

    return additions;
  }

  clear() {
    this.hash = {};
    this.input = [];
    this.output = [];
  }

  all() {
    return { input: this.input, output: this.output };
  }

  load(file) {
    if (fs.existsSync(file)) {
      const record = JSON.parse(fs.readFileSync(file));
      this.hash = record.hash;
      this.input = record.input;
      this.output = record.output;
    }

    return this;
  }

  store(file) {
    fs.writeFileSync(file, JSON.stringify({
      hash: this.hash,
      input: this.input,
      output: this.output,
    }));
  }

}
