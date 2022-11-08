import train from "./train.js";
import drill from "./samples/drill.js";
import gen from "./samples/generate.js";

function parse(args) {
  if (args && args.length > 2) {
    if (args[2] === "gen") return ["gen"];
    if (args[2] === "drill") return ["drill"];
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
      console.log("Learning by playing in game...");
      while (true) await train();
    }

    default: {
      console.log("Use one of the commands:");
      console.log(" - gen - to generate samples");
      console.log(" - play - to play in game");
      break;
    }
  }

  console.log("Done");
}

run(...parse(process.argv)).catch(error => console.log("ERROR:", error));
