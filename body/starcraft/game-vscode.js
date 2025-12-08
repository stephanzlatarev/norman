import Game from "./game.js";
import trace from "./trace/trace.js";
import { toggle as toggleOrderTracing } from "./trace/orders.js";

export default class VscodeGame extends Game {

  async connect() {
    toggleOrderTracing(false);

    console.log("Connecting to StarCraft II game...");

    for (let i = 0; i < 12; i++) {
      try {
        await this.client.connect({ host: "127.0.0.1", port: 5000 });
        break;
      } catch (_) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    console.log("Joining game...");
    await this.client.joinGame({ race: 3, options: { raw: true, score: true } });

    console.log("Playing...");
  }

  async step() {
    await super.step();
    await trace(this.client, this.chat);
  }

}
