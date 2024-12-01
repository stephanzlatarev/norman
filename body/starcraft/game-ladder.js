import fs from "fs";
import Game from "./game.js";
import Resources from "./memo/resources.js";

const FILE_VERSION = "./version";

export default class LadderGame extends Game {

  async connect() {
    const ladder = parseArguments(process.argv);

    await this.client.connect({
      host: ladder.ladderServer,
      port: ladder.gamePort,
    });

    let startPort = ladder.startPort + 1;

    const player = {};

    player.race = 3;
    player.options = { raw: true };
    player.sharedPort = startPort++;
    player.serverPorts = { gamePort: startPort++, basePort: startPort++ };
    player.clientPorts = [
      { gamePort: startPort++, basePort: startPort++ },
      { gamePort: startPort++, basePort: startPort++ },
    ];

    await this.client.joinGame(player);
  }

  async step() {
    await super.step();

    if ((Resources.loop === 10) && fs.existsSync(FILE_VERSION)) {
      this.say("tag: V" + fs.readFileSync(FILE_VERSION, "utf8"));
    }
  }

}

function parseArguments(args) {
  const ladder = {};

  if (args && args.length) {
    for (let i = 0; i < args.length - 1; i++) {
      if (args[i] === "--LadderServer") {
        ladder.ladderServer = args[i + 1];
      } else if (args[i] === "--GamePort") {
        ladder.gamePort = parseInt(args[i + 1]);
      } else if (args[i] === "--StartPort") {
        ladder.startPort = parseInt(args[i + 1]);
      }
    }
  }

  return ladder;
}
