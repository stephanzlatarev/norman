
class Score {

  sync(observation) {
    const score = observation?.score?.scoreDetails;

    if (score) {
      this.currrentValueArmy = score.usedMinerals.army + score.usedVespene.army;
      this.killedValueArmy = score.killedMinerals.army + score.killedVespene.army;
      this.lostValueArmy = score.lostMinerals.army + score.lostVespene.army;
    }
  }

}

export default new Score();
