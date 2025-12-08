import Battle from "../battle/battle.js";

const polygons = new Map();
const rallies = new Map();

export default function(shapes, texts) {
  const battles = Battle.list().sort((a, b) => (b.priority - a.priority));

  texts.push("Prio Front Mode  Rally Recruit Deployed Detector");

  for (const battle of battles) {
    if (!battle.front) continue;

    const text = [];

    text.push(battle.priority, " ");
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

    const isPrimaryBattle = (battle === battles[0]);
    const color = getBattleColor(battle);
    const polygon = getBattlePolygon(battle);

    if (isPrimaryBattle) {
      shapes.push({
        shape: "polygon",
        points: polygon,
        color: color,
        filled: true,
        opacity: 0.3,
      });
    }

    shapes.push({
      shape: "polygon",
      points: polygon,
      color: color,
      dotted: true,
      width: 0.8,
      opacity: 0.8,
    });

    shapes.push({
      shape: "arrow",
      x1: battle.rally.x, y1: battle.rally.y,
      x2: battle.front.x, y2: battle.front.y,
      r: 4,
      color: color,
      filled: true,
      opacity: 0.9,
    });
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

function getBattleColor(battle) {
  switch (battle.mode) {
    case "fight": return "red";
    case "smash": return "orange";
    case "stand": return "white";
    case "watch": return "white";
    default: return "yellow";
  }
}

function getBattlePolygon(battle) {
  if (battle.rally === rallies.get(battle.front)) {
    return polygons.get(battle.front);
  }

  const polygon = getBattleContour(battle);

  polygons.set(battle.front, polygon);
  rallies.set(battle.front, battle.rally);

  return polygon;
}

const SIDE_LEFT = 1;
const SIDE_TOP = 2;
const SIDE_RIGHT = 3;
const SIDE_BOTTOM = 4;

function getBattleContour(battle) {
  const sectors = new Set(battle.sectors);
  const start = findLeftSector(sectors);
  const points = [start.bounds.left, start.bounds.top];

  let { sector, side } = getNextMove(sectors, start, SIDE_LEFT);

  while ((sector !== start) || (side !== SIDE_LEFT)) {
    switch (side) {
      case SIDE_LEFT: { points.push(sector.bounds.left, sector.bounds.top); break; }
      case SIDE_TOP: { points.push(sector.bounds.right, sector.bounds.top); break; }
      case SIDE_RIGHT: { points.push(sector.bounds.right, sector.bounds.bottom); break; }
      case SIDE_BOTTOM: { points.push(sector.bounds.left, sector.bounds.bottom); break; }
    }

    const move = getNextMove(sectors, sector, side);
    sector = move.sector;
    side = move.side;
  }

  return points;
}

function findLeftSector(sectors) {
  let left;

  for (const sector of sectors) {
    if (!left || (sector.col < left.col)) {
      left = sector;
    }
  }

  return left;
}

function getNextMove(sectors, sector, side) {
  switch (side) {
    case SIDE_LEFT: {
      const topLeft = getSector(sectors, sector.col - 1, sector.row - 1);
      if (topLeft) return { sector: topLeft, side: SIDE_BOTTOM };

      const top = getSector(sectors, sector.col, sector.row - 1);
      if (top) return { sector: top, side: SIDE_LEFT };

      return { sector, side: SIDE_TOP };
    }
    case SIDE_TOP: {
      const rightTop = getSector(sectors, sector.col + 1, sector.row - 1);
      if (rightTop) return { sector: rightTop, side: SIDE_LEFT };

      const right = getSector(sectors, sector.col + 1, sector.row);
      if (right) return { sector: right, side: SIDE_TOP };

      return { sector, side: SIDE_RIGHT };
    }
    case SIDE_RIGHT: {
      const bottomRight = getSector(sectors, sector.col + 1, sector.row + 1);
      if (bottomRight) return { sector: bottomRight, side: SIDE_TOP };

      const bottom = getSector(sectors, sector.col, sector.row + 1);
      if (bottom) return { sector: bottom, side: SIDE_RIGHT };

      return { sector, side: SIDE_BOTTOM };
    }
    case SIDE_BOTTOM: {
      const leftBottom = getSector(sectors, sector.col - 1, sector.row + 1);
      if (leftBottom) return { sector: leftBottom, side: SIDE_RIGHT };

      const left = getSector(sectors, sector.col - 1, sector.row);
      if (left) return { sector: left, side: SIDE_BOTTOM };

      return { sector, side: SIDE_LEFT };
    }
  }
}

function getSector(sectors, col, row) {
  for (const sector of sectors) {
    if ((sector.col === col) && (sector.row === row)) {
      return sector;
    }
  }
}
