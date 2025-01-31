import Game from "./game.js";
import Battle from "./battle/battle.js";
import { ALERT_WHITE } from "./map/alert.js";
import Zone from "./map/zone.js";

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

const Color = {
  Blue: { r: 100, g: 100, b: 200 },
  Green: { r: 0, g: 200, b: 0 },
  White: { r: 200, g: 200, b: 200 },
  Yellow: { r: 200, g: 200, b: 0 },
  Orange: { r: 200, g: 100, b: 0 },
  Pink: { r: 200, g: 100, b: 100 },
  Red: { r: 200, g: 0, b: 0 },
  Purple: { r: 200, g: 0, b: 200 },
  Unknown: { r: 100, g: 100, b: 100 },
};
const ALERT_COLOR = [Color.Unknown, Color.Blue, Color.Green, Color.White, Color.Yellow, Color.Orange, Color.Pink, Color.Red];

async function trace(client) {
  const texts = [];
  const spheres = [];

  traceAlertLevels(spheres);
  traceBattles(texts);

  await client.debug({ debug: [{ draw: { text: texts, spheres: spheres } }] });
}

function traceAlertLevels(spheres) {
  for (const zone of Zone.list()) {
    if (zone.isCorridor) continue;
    if (zone.alertLevel === ALERT_WHITE) continue;

    spheres.push({ p: { x: zone.x, y: zone.y, z: 0 }, r: zone.r, color: ALERT_COLOR[zone.alertLevel] });
  }
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
