import Resources from "../memo/resources.js";
import Detect from "../jobs/detect.js";

const ATTACK_BALANCE = 1.6;
const RALLY_BALANCE  = 1.0;
const DEFEND_BALANCE = 0.7;

export default class Battle {

  static MODE_FIGHT = "fight";
  static MODE_RALLY = "rally";
  static MODE_SMASH = "smash";

  mode = Battle.MODE_RALLY;

  recruitedBalance = 0;
  deployedBalance = 0;

  stations;
  detector;
  fighters;

  constructor(zone) {
    console.log("Battle", zone.name, "begins");

    zone.battle = this;

    this.zone = zone;
    this.zones = getBattleZones(zone);

    this.stations = [];
    this.detector = null;
    this.fighters = [];
    this.priority = 0;
  }

  run() {
    const threats = [];

    if (this.stations.length && this.fighters.find(fighter => !! fighter.assignee)) {
      // At least one fighter is assigned. We need detection
      if (!this.detector || this.detector.isDone || this.detector.isFailed) {
        this.detector = new Detect(this);
      }
    } else {
      // No fighters are assigned. We don't need detection yet
      if (this.detector) {
        this.detector.close(true);
        this.detector = null;
      }
    }

    for (const zone of this.zones) {
      for (const threat of zone.threats) {

        // Don't count enemy workers as threats because they are not ranged and trading warriors for enemy workers is ok.
        if (threat.type.isWorker) continue;

        // TODO: Add spell casters and later air-hitters
        if (threat.type.damageGround) {
          threats.push(threat);
        }
      }
    }

    this.deployedBalance = calculateBalance(this.fighters, threats, true);
    this.recruitedBalance = calculateBalance(this.fighters, threats, false);

    if ((Resources.supplyUsed > 190) && ((this.deployedBalance >= ATTACK_BALANCE) || areEnoughFightersRallied(this.fighters, this.zones))) {
      // Keep recruited balance low so that new warriors are recruited
      this.recruitedBalance = 0;

      // Keep attacking
      this.deployedBalance = Infinity;
      this.mode = Battle.MODE_FIGHT;
    } else if (threats.length) {

      if (this.zone.tier.level === 1) {
        if ((this.deployedBalance >= DEFEND_BALANCE) || areEnoughFightersRallied(this.fighters, this.zones)) {
          this.mode = Battle.MODE_FIGHT;
        } else {
          this.mode = Battle.MODE_RALLY;
        }
      } else if (this.zone.tier.level === 2) {
        if (this.deployedBalance >= DEFEND_BALANCE) {
          this.mode = Battle.MODE_FIGHT;
        } else {
          this.mode = Battle.MODE_RALLY;
        }
      } else {
        if (this.deployedBalance >= ATTACK_BALANCE) {
          this.mode = Battle.MODE_FIGHT;
        } else if (this.deployedBalance < RALLY_BALANCE) {
          this.mode = Battle.MODE_RALLY;
        }
      }

    } else {
      // Keep recruited balance such that there are at least three fighters per target
      this.recruitedBalance = this.fighters.length / (1 + this.zone.threats.size * 3);

      // Keep attacking
      this.deployedBalance = Infinity;
      this.mode = Battle.MODE_SMASH;
    }

    if (this.detector) this.detector.priority = this.priority;
    for (const fighter of this.fighters) fighter.priority = this.priority;
  }

  close() {
    console.log("Battle", this.zone.name, "ends");

    this.zone.battle = null;
    if (this.detector) this.detector.close(true);

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

function calculateBalance(fighters, threats, countDeployedOnly) {
  let warriorDamage = 0;
  let warriorHealth = 0;
  let enemyDamage = 0;
  let enemyHealth = 0;

  for (const fighter of fighters) {
    const warrior = fighter.assignee;

    if (!warrior || !warrior.isAlive) continue;
    if (countDeployedOnly && !fighter.isDeployed) continue;

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
