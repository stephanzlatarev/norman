import readline from "readline";
import drill from "./drill.js";
import play from "./play.js";

function parse(args) {
  if (args && args.length > 2) {
    if (args[2] === "drill") return ["drill", args[3]];
    if (args[2] === "play") return ["play"];
  }

  return [];
}

async function run(tool, param) {
  switch (tool) {

    case "drill": {
      console.log("Learning", param, "by samples...");
      await drill(param);
      break;
    }

    case "play": {
      console.log("Playing in game...");
      await play();
      break;
    }

    default: {
      console.log("Use one of the commands:");
      console.log(" - gen - to generate samples");
      console.log(" - drill - to learn samples");
      console.log(" - play - to play in game");
      console.log(" - test - to test how well samples have been learnt");
      break;
    }
  }

  console.log("Done");
  process.exit(0);
}

run(...parse(process.argv)).catch(error => { console.log("ERROR:", error); process.exit(1); });

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
