import fs from "fs";
import Brain from "./brain.js";
import Skill from "./skill.js";

export async function loadSkills(memory) {
  await loadFolder(memory, "./skill");
}

async function loadFolder(memory, folder) {
  const mapping = folder + "/mapping.json";

  if (fs.existsSync(mapping)) {
    const descriptor = JSON.parse(fs.readFileSync(mapping));

    if (descriptor.label && descriptor.given && descriptor.when && descriptor.then) {
      await loadSkill(memory, folder, descriptor);
    }
  } else {
    const subfolders = fs.readdirSync(folder, { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

    if (subfolders.length) {
      for (const subfolder of subfolders) {
        await loadFolder(memory, folder + "/" + subfolder);
      }
    }
  }
}

async function loadSkill(memory, folder, descriptor) {
  try {
    let brain;

    if (fs.existsSync(folder + "/brain.tf")) {
      brain = new Brain(folder);
    } else if (fs.existsSync(folder + "/brain.js")) {
      const module = await import("." + folder + "/brain.js");
      brain = new module.default();
    }

    if (brain) {
      new Skill(descriptor.label, memory, brain, descriptor.given, descriptor.when, descriptor.then);

      console.log("Successfully loaded skill:", descriptor.label);
    }
  } catch (error) {
    console.log("Failed to load skill:", descriptor.label, "due to:", error);
  }
}
