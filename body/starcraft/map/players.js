
export function mapPlayers(model, gameInfo, observation) {
  const owner = observation.playerCommon.playerId;
  model.add("Game").set("owner", owner);

  const enemy = getEnemyId(gameInfo, owner);
  model.add("Enemy").set("owner", enemy)

  const enemyBase = gameInfo.startRaw.startLocations[0];

  if (enemyBase) {
    model.get("Enemy").set("baseX", enemyBase.x).set("baseY", enemyBase.y);
  }
}

function getEnemyId(gameInfo, owner) {
  for (const player of gameInfo.playerInfo) {
    if (owner !== player.playerId) {
      return player.playerId;
    }
  }
}
