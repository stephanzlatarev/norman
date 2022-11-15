
export default class Memory {

  constructor(size, minScore) {
    this.maxSize = size;
    this.minScore = minScore || 0;
    this.clear();
  }

  add(input, output, score) {
    if (score < this.minScore) return;

    const inputHash = JSON.stringify(input);
    const outputHash = JSON.stringify(output);
    if (this.hash[inputHash] && (this.hash[inputHash] !== outputHash)) {
      if (this.options.informAboutCollisions) console.log("Memory collision detected:", inputHash, "requires", this.hash[inputHash], "and", outputHash);
      return;
    }
    this.hash[inputHash] = JSON.stringify(output);

    if (this.score.length && (score > this.score[this.score.length - 1])) {
      let index = 0;
      for (; index < this.score.length; index++) {
        if (score > this.score[index]) break;
      }

      this.input.splice(index, 0, [...input]);
      this.output.splice(index, 0, [...output]);
      this.score.splice(index, 0, score);
    } else {
      this.input.push([...input]);
      this.output.push([...output]);
      this.score.push(score);
    }

    if (this.output.length > this.maxSize) {
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
    this.hash = {};
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

}
