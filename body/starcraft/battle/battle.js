import Resources from "../memo/resources.js";
import Detect from "../jobs/detect.js";

const FIGHT_BALANCE = 2;
const RALLY_BALANCE = 1;

export default class Battle {

  static MODE_FIGHT = "fight";
  static MODE_RALLY = "rally";
  static MODE_SMASH = "smash";

  mode = Battle.MODE_RALLY;

  recruitedBalance = 0;
  deployedBalance = 0;

  detector;
  fighters;

  constructor(zone) {
    console.log("Battle", zone.name, "begins");

    zone.battle = this;

    this.zone = zone;
    this.zones = getBattleZones(zone);

    this.detector = new Detect(this);
    this.fighters = [];
    this.priority = 0;
  }

  run() {
    const threats = [];

    if (this.detector.isDone || this.detector.isFailed) this.detector = new Detect(this);

    for (const zone of this.zones) {
      for (const threat of zone.threats) {
        // TODO: Add spell casters and later air-hitters
        if (threat.type.damageGround) {
          threats.push(threat);
        }
      }
    }

    this.deployedBalance = calculateBalance(this.fighters, threats, this.zones);
    this.recruitedBalance = calculateBalance(this.fighters, threats);

    if ((Resources.supplyUsed > 190) && ((this.deployedBalance > FIGHT_BALANCE) || areEnoughFightersRallied(this.fighters, this.zones))) {
      // Keep recruited balance low so that new warriors are recruited
      this.recruitedBalance = 0;

      // Keep attacking
      this.deployedBalance = Infinity;
      this.mode = Battle.MODE_FIGHT;
    } else if (threats.length) {

      if (this.deployedBalance > FIGHT_BALANCE) {
        this.mode = Battle.MODE_FIGHT;
      } else if (this.deployedBalance < RALLY_BALANCE) {
        this.mode = Battle.MODE_RALLY;
      }

    } else {
      // Keep recruited balance such that there are at least three fighters per target
      this.recruitedBalance = this.fighters.length / (1 + this.zone.threats.size * 3);

      // Keep attacking
      this.deployedBalance = Infinity;
      this.mode = Battle.MODE_SMASH;
    }

    this.detector.priority = this.priority;
    for (const fighter of this.fighters) fighter.priority = this.priority;
  }

  close() {
    console.log("Battle", this.zone.name, "ends");

    this.zone.battle = null;
    this.detector.close(true);

    for (const job of [...this.fighters]) {
      job.close(true);
    }
  }

}

function getBattleZones(zone) {
  const zones = new Set();

  zones.add(zone);

  for (const corridor of zone.corridors) {
    if (corridor.cells.size) zones.add(corridor);

    for (const neighbor of corridor.zones) {
      zones.add(neighbor);
    }
  }

  return zones;
}

function calculateBalance(fighters, threats, zones) {
  let warriorDamage = 0;
  let warriorHealth = 0;
  let enemyDamage = 0;
  let enemyHealth = 0;

  for (const fighter of fighters) {
    const warrior = fighter.assignee;

    if (!warrior || !warrior.isAlive) continue;
    if (zones && !zones.has(warrior.zone)) continue;

    warriorDamage += warrior.type.damageGround;
    warriorHealth += warrior.armor.total;
  }

  for (const enemy of threats) {
    if (enemy.type.damageGround > 0) {
      enemyDamage += enemy.type.damageGround;
      enemyHealth += enemy.armor.total;
    }
  }

  const warriorStrength = warriorHealth * warriorDamage;
  const enemyStrength = enemyHealth * enemyDamage;

  return (enemyStrength > 0) ? (warriorStrength / enemyStrength) : Infinity;
}

function areEnoughFightersRallied(fighters, zones) {
  let deployed = 0;
  let rallying = 0;

  for (const fighter of fighters) {
    const warrior = fighter.assignee;

    if (warrior && warrior.isAlive) {
      if (zones.has(warrior.zone)) {
        deployed++;
      } else {
        rallying++;
      }
    }
  }

  return (deployed > rallying * 4);
}
