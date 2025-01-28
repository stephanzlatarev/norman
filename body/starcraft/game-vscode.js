import Game from "./game.js";
import Battle from "./battle/battle.js";

export default class VscodeGame extends Game {

  async connect() {
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
    await this.client.joinGame({ race: 3, options: { raw: true } });

    console.log("Playing...");
  }

  async step() {
    await trace(this.client);
    await super.step();
  }

}

async function trace(client) {
  const texts = [];

  traceBattles(texts);

  await client.debug({ debug: [{ draw: { text: texts } }] });

}

function traceBattles(texts) {
  const battles = Battle.list().sort((a, b) => (b.priority - a.priority));
  let y = 1;

  texts.push({ text: "Tier Zone Recruit/Rallied Mode  Frontline", virtualPos: { x: 0, y: 0 } });

  for (const battle of battles) {
    const zone = battle.zone;
    const text = [threeletter(" ", zone.tier.level), threeletter(" ", zone.name)];

    text.push(balanceText(battle.recruitedBalance));
    text.push(balanceText(battle.deployedBalance));
    text.push(battle.mode);
    text.push(battle.lines.map(line => line.zone.name).join(" "));

    texts.push({ text: text.join(" "), virtualPos: { x: 0, y: y++ } });
  }
}

function threeletter(tab, text) {
  if (!text) return tab + "  -";

  if (text >= 0) {
    if (text > 999) return tab + "999";
    if (text > 99) return tab + text;
    if (text > 9) return tab + " " + text;
    return tab + "  " + text;
  } else if (text.length > 0) {
    if (text.length > 3) return tab + text.slice(0, 3);
    if (text.length === 3) return tab + text;
    if (text.length === 2) return tab + " " + text;
    return tab + "  " + text;
  }

  return tab + " X ";
}

function balanceText(balance) {
  if (balance >= 1000) {
    return " all in";
  } else if (balance >= 100) {
    return balance.toFixed(3);
  } else if (balance >= 10) {
    return balance.toFixed(4);
  } else if (balance <= 0) {
    return "   -   ";
  }

  return balance.toFixed(5);
}
