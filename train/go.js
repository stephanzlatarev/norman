import drill from "./samples/drill.js";
import gen from "./samples/generate.js";
import test from "./samples/test.js";
import play from "./play.js";

function parse(args) {
  if (args && args.length > 2) {
    if (args[2] === "gen") return ["gen"];
    if (args[2] === "drill") return ["drill"];
    if (args[2] === "play") return ["play"];
    if (args[2] === "test") return ["test"];
  }

  return [];
}

async function run(tool) {
  switch (tool) {
    case "gen": {
      console.log("Generating samples...");
      await gen();
      break;
    }

    case "drill": {
      console.log("Learning by samples...");
      await drill();
      break;
    }

    case "play": {
      console.log("Playing in game...");
      await play();
      break;
    }

    case "test": {
      console.log("Testing samples...");
      await test();
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
}

run(...parse(process.argv)).catch(error => console.log("ERROR:", error));
