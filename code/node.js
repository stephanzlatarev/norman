// Memory nodes store information as numbers and links to other nodes
export default class Node {

  constructor(ref, callback) {
    this.ref = ref;
    this.callback = callback;

    this.data = {};
  }

  clear(label) {
    return this.set(label, 0);
  }

  set(label, value) {
    if (this.data[label] === value) return this;

    if (value instanceof Node) {
      this.data[label] = value;
    } else if ((value === 0) || (value === false)) {
      delete this.data[label];
    } else if ((value > 0) || (value < 0)) {
      this.data[label] = value;
    } else {
      return this;
    }

    if (this.callback) {
      this.callback(this, label, value);
    }

    return this;
  }

  get(label) {
    const data = this.data[label];

    if (!data) return 0;

    return data;
  }

  match(data) {
    for (const label in data) {
      const a = data[label] ? data[label] : 0;
      const b = this.get(label);

      if (!a && b) return false;
      if (a !== b) return false;
    }

    return true;
  }

}
