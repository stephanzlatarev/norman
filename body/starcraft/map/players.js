
export function mapPlayers(model, gameInfo, observation) {
  const owner = observation.playerCommon.playerId;
  const enemy = getEnemyId(gameInfo, owner);
  const enemyBase = gameInfo.startRaw.startLocations[0];

  model.add("Game").set("owner", owner);
  model.add("Enemy").set("owner", enemy).set("baseX", enemyBase.x).set("baseY", enemyBase.y);
}

function getEnemyId(gameInfo, owner) {
  for (const player of gameInfo.playerInfo) {
    if (owner !== player.playerId) {
      return player.playerId;
    }
  }
}
