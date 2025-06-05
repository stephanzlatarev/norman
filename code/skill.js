import fs from "fs";
import path from "path";
import YAML from "yaml";

export default class Skill {

  constructor(definition, module) {
    this.name = definition.name;
    this.run = module.default;

    console.log("Attached skill:", this.name);
  }

  run() {}

  static async create(filepath) {
    const dirname = path.dirname(filepath);
    const definition = YAML.parse(fs.readFileSync(filepath, "utf8"));

    if (definition.active !== false) {
      return new Skill(definition, await import("file://" + path.resolve(dirname, definition.brain)));
    }
  }

}
