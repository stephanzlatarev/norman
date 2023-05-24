
export function mapPlayers(model, gameInfo, observation) {
  const owner = observation.playerCommon.playerId;
  const enemy = getEnemyId(gameInfo, owner);
  const enemyBase = gameInfo.startRaw.startLocations[0];

  model.add("Game").set("owner", owner);
  model.add("Enemy").set("owner", enemy).set("baseX", enemyBase.x).set("baseY", enemyBase.y);

  mapPlayableArea(model, gameInfo);
}

function getEnemyId(gameInfo, owner) {
  for (const player of gameInfo.playerInfo) {
    if (owner !== player.playerId) {
      return player.playerId;
    }
  }
}

function mapPlayableArea(model, gameInfo) {
  const playArea = gameInfo.startRaw.playableArea;

  const left = playArea.p0.x;
  const top = playArea.p0.y;
  const width = playArea.p1.x - playArea.p0.x;
  const height = playArea.p1.y - playArea.p0.y;

  const cellWidth = width / 10;
  const cellHeight = height / 10;

  model.add("Map").set("left", left).set("top", top).set("width", width).set("height", height)
    .set("cellWidth", cellWidth).set("cellHeight", cellHeight);
}
