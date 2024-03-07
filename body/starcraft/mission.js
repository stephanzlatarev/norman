import fs from "fs";
import Memory from "../../code/memory.js";

const missions = [];

export default class Mission extends Memory {

  constructor() {
    super();

    missions.push(this);
  }

  remove() {
    const index = missions.indexOf(this);

    if (index >= 0) {
      missions.splice(index, 1);
    }
  }

  static list() {
    return missions;
  }

}

async function load() {
  try {
    const files = fs.readdirSync("./body/starcraft/missions", { withFileTypes: true }).filter(dirent => dirent.isFile()).map(dirent => dirent.name);

    for (const file of files) {
      const module = await import("./missions/" + file);
      const mission = new module.default();

      console.log("Successfully loaded mission:", mission.constructor.name);
    }

  } catch (error) {
    console.log("Failed to load missions due to:", error);
  }
}

load();
