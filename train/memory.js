import fs from "fs";

export default class Memory {

  constructor(size, minScore) {
    this.maxSize = size;
    this.minScore = minScore || 0;
    this.clear();
  }

  add(input, output, score) {
    if (score < this.minScore) return;

    const inputHash = JSON.stringify(input);
    const previous = this.index[inputHash];
    if (previous >= 0) {
      if (score > this.score[previous]) {
        this.input[previous] = [...input];
        this.output[previous] = [...output];
        this.score[previous] = score;
      }
      return;
    }

    if (this.score.length && (score > this.score[this.score.length - 1])) {
      let index = 0;
      for (; index < this.score.length; index++) {
        if (score > this.score[index]) break;
      }

      this.input.splice(index, 0, [...input]);
      this.output.splice(index, 0, [...output]);
      this.score.splice(index, 0, score);
      this.index[inputHash] = index;
    } else {
      this.input.push([...input]);
      this.output.push([...output]);
      this.score.push(score);
      this.index[inputHash] = this.input.length - 1;
    }

    if (this.output.length > this.maxSize) {
      for (let i = this.maxSize; i < this.output.length; i++) delete this.index[JSON.stringify(this.input[i])];

      this.input.length = this.maxSize;
      this.output.length = this.maxSize;
      this.score.length = this.maxSize;
    }
  }

  clear(options) {
    this.options = options || {};
    this.input = [];
    this.output = [];
    this.score = [];
    this.index = {};
  }

  all() {
    return { input: this.input, output: this.output };
  }

  batch(size) {
    if (size >= this.input.length) return this.all();

    const input = [];
    const output = [];

    for (let i = 0; i < size; i++) {
      const index = Math.floor(this.input.length * Math.random() * Math.random());

      input.push(this.input[index]);
      output.push(this.output[index]);
    }

    return { input: input, output: output };
  }

  load(file) {
    if (fs.existsSync(file)) {
      const record = JSON.parse(fs.readFileSync(file));
      this.options = record.options;
      this.input = record.input;
      this.output = record.output;
      this.score = record.score;
    }

    return this;
  }

  store(file) {
    fs.writeFileSync(file, JSON.stringify({
      options: this.options,
      input: this.input,
      output: this.output,
      score: this.score,
      index: this.index,
    }));
  }

}
