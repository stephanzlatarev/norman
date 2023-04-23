import fs from "fs";
import Skill from "./skill.js";

export async function loadSkills(memory) {
  await loadFolder(memory, "./skill");
}

async function loadFolder(memory, folder) {
  const subfolders = fs.readdirSync(folder, { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

  if (subfolders.length) {
    for (const subfolder of subfolders) {
      await loadFolder(memory, folder + "/" + subfolder);
    }
  } else {
    const mapping = folder + "/mapping.json";

    if (fs.existsSync(mapping)) {
      const descriptor = JSON.parse(fs.readFileSync(mapping));

      if (descriptor.given && descriptor.when && descriptor.then) {
        await loadSkill(memory, folder, descriptor);
      }
    }
  }
}

async function loadSkill(memory, folder, descriptor) {
  if (fs.existsSync(folder + "/brain.js")) {
    try {
      const module = await import("." + folder + "/brain.js");
      const brain = new module.default();

      new Skill(descriptor.label, memory, brain, descriptor.given, descriptor.when, descriptor.then);

      console.log("Successfully loaded skill:", descriptor.label);
    } catch (error) {
      console.log("Failed to load skill:", descriptor.label, "due to:", error);
    }
  }
}
