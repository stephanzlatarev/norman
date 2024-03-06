
export function mapResources(_, map, homebase) {
  for (const base of map.bases) setCenterAndDistance(base, homebase);
}

function setCenterAndDistance(base, homebase) {
  const x = base.x + base.w / 2 + 1;
  const y = base.y + base.h / 2 + 1;

  base.centerX = x;
  base.centerY = y;
  base.squareDistanceToHomeBase = (homebase.x - x) * (homebase.x - x) + (homebase.y - y) * (homebase.y - y);
}
