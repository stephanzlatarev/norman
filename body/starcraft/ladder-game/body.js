import Game from "../game.js";

export default class LadderGame extends Game {

  constructor() {
    super();
    this.ladder = parseArguments(process.argv);
  }

  async attach() {
    await this.client.connect({
      host: this.ladder.ladderServer,
      port: this.ladder.gamePort,
    });

    let startPort = this.ladder.startPort + 1;

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
