
export default class {

  constructor(size, minScore) {
    this.maxSize = size;
    this.minScore = minScore || 0;

    this.input = [];
    this.output = [];
    this.score = [];
  }

  push(input, output, score) {
    if (score < this.minScore) return;

    if (this.score.length && (score > this.score[this.score.length - 1])) {
      let index = 0;
      for (; index < this.score.length; index++) {
        if (score > this.score[index]) break;
      }

      this.input.splice(index, 0, input);
      this.output.splice(index, 0, output);
      this.score.splice(index, 0, score);
    } else {
      this.input.push(input);
      this.output.push(output);
      this.score.push(score);
    }

    if (this.output.length > this.maxSize) {
      this.input.length = this.maxSize;
      this.output.length = this.maxSize;
      this.score.length = this.maxSize;
    }
  }

  batch(size, transform) {
    if ((size >= this.input.length) && !transform) return { input: this.input, output: this.output };

    const input = [];
    const output = [];

    for (let i = 0; i < size; i++) {
      const index = Math.floor(this.input.length * Math.random() * Math.random());

      if (transform) {
        input.push(transform(this.input[index]));
        output.push(transform(this.output[index]));
      } else {
        input.push(this.input[index]);
        output.push(this.output[index]);
      }
    }

    return { input: input, output: output };
  }

}
