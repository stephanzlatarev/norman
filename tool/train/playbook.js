import fs from "fs";

export default class Playbook {

  constructor(skill) {
    this.folder = skill ? "./skill/" + skill : ".";
    this.plays = [];
    this.hashes = {};

    load(this);
  }

  [Symbol.iterator]() {
    return this.plays.map(play => ({ input: play.input, output: play.output, comment: play.comment })).values();
  }

  read() {
    return {
      input: this.plays.map(play => play.input),
      output: this.plays.map(play => play.output),
    };
  }

  add(input, output, comment) {
    const inputFloat32 = new Float32Array(input);
    const inputBase64 = Buffer.from(inputFloat32.buffer).toString("base64");

    if (this.hashes[inputBase64]) return;

    const outputFloat32 = new Float32Array(output);
    const outputBase64 = Buffer.from(outputFloat32.buffer).toString("base64");
    const play = {
      input: inputFloat32,
      inputBase64: inputBase64,
      output: outputFloat32,
      outputBase64: outputBase64,
      comment: comment,
    };

    this.hashes[inputBase64] = true;
    this.plays.push(play);

    return play;
  }

  clear() {
    this.plays = [];
    this.hashes = {};

    return this;
  }

  mirror(mirrors) {
    const plays = [...this.plays];

    this.clear();

    for (const play of plays) {
      for (const mirror of mirrors) {
        this.add(mirror(play.input), mirror(play.output));
      }
    }

    return this;
  }

  reduce(size) {
    while (this.plays.length > size) {
      const index = Math.floor(this.plays.length * Math.random());
      this.hashes[this.plays[index].inputBase64] = false;
      this.plays.splice(index, 1);
    }
  }

  save() {
    save(this);
  }
}

function load(playbook) {
  const files = fs.readdirSync(playbook.folder, { withFileTypes: true }).filter(dirent => (dirent.isFile() && dirent.name.endsWith(".book"))).map(file => file.name);

  for (const file of files) {
    const lines = fs.readFileSync(playbook.folder + "/" + file, "utf-8").split("\r\n");
    for (const line of lines) {
      const parts = line.trim().split(" ");

      if (parts.length >= 2) {
        playbook.hashes[parts[0]] = true;
        playbook.plays.push({
          file: file,
          input: new Float32Array(new Uint8Array(Buffer.from(parts[0], "base64")).buffer),
          inputBase64: parts[0],
          output: new Float32Array(new Uint8Array(Buffer.from(parts[1], "base64")).buffer),
          outputBase64: parts[1],
          comment: (parts.length > 2) ? parts.slice(2).join(" ") : undefined,
        });
      }
    }
  }
}

function save(playbook) {
  const file = playbook.folder + "/play.book";

  // Clear the file
  fs.writeFileSync(file, "");

  for (const play of playbook.plays.filter(play => !play.file)) {
    fs.appendFileSync(file, play.inputBase64);
    fs.appendFileSync(file, " ");
    fs.appendFileSync(file, play.outputBase64);

    if (play.comment) {
      fs.appendFileSync(file, " ");
      fs.appendFileSync(file, play.comment);
    }

    fs.appendFileSync(file, "\r\n");
  }
}
