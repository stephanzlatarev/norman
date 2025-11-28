import Battle from "../battle/battle.js";

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

export default function(lines, texts) {
  const battles = Battle.list().sort((a, b) => (b.priority - a.priority));

  texts.push("Front Mode  Rally Recruit Deployed Detector");

  for (const battle of battles) {
    const text = [];

    text.push(battle.front.name, " ");
    text.push(battle.mode);
    text.push(battle.rally.name, " ");
    text.push(balanceText(battle.recruitedBalance));
    text.push(balanceText(battle.deployedBalance) + " ");

    if (battle.detector && battle.detector.assignee) {
      const detector = battle.detector.assignee;
      text.push(detector.type.name + " " + detector.nick);
    } else {
      text.push("no");
    }

    texts.push(text.join(" "));

    const front = { x: battle.front.x, y: battle.front.y };
    for (const sector of battle.sectors) {
      lines.push({ line: { p0: { x: sector.x, y: sector.y }, p1: front }, color: Color.Red });
    }
    if (battle.rally !== battle.front) {
      lines.push({ line: { p0: { x: battle.rally.x, y: battle.rally.y }, p1: front }, color: Color.Yellow });
    }
  }

  texts.push("");
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
