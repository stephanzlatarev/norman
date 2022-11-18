
export default class Memory {

  constructor() {
    this.memory = {};
    this.refs = [];
  }

  clear(label) {
    delete this.memory[label];
  }

  set(label, value) {
    this.memory[label] = value;
  }

  get(query) {
    const data = this.memory[query];

    if (typeof(data) === "function") {
      return data();
    } else {
      return this.memory[query];
    }
  }

  ref(tag) {
    if (!tag) return;

    let index = this.refs.indexOf(tag);

    if (index < 0) {
      index = this.refs.length;
      this.refs.push(tag);
      this.set("ref/" + index, tag);
    }

    return index;
  }

}

export const memory = new Memory();
