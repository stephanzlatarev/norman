import Frontline from "./frontline.js";
import Resources from "../memo/resources.js";
import Detect from "../jobs/detect.js";

const FIGHT_BALANCE = 2;
const RALLY_BALANCE = 1;

export default class Battle {

  static MODE_FIGHT = "fight";
  static MODE_RALLY = "rally";

  mode = Battle.MODE_RALLY;
  balance = 0;

  frontline;

  detector;
  fighters;

  constructor(zone) {
    console.log("Battle", zone.name, "begins");

    zone.battle = this;

    this.zone = zone;
    this.detector = new Detect(this);
    this.fighters = [];

    this.frontline = new Frontline(zone);
    this.priority = 0;
  }

  run() {
    const threats = [];
    const passives = [];

    for (const zone of this.frontline.zones) {
      for (const threat of zone.threats) {
        // TODO: Add spell casters and later air-hitters
        if (threat.type.damageGround) {
          threats.push(threat);
        }
      }
    }
    for (const threat of this.zone.threats) {
      if (!threat.type.damageGround) {
        passives.push(threat);
      }
    }

    if ((Resources.supplyUsed > 190) && areMostFightersRallied(this.fighters, this.frontline.zones)) {
      this.frontline.fight(threats.length ? threats : this.zone.threats, passives);

      // Keep balance low so that new warriors are recruited
      this.balance = 0;

      // Attack with available warriors so that army gets rotated
      this.mode = Battle.MODE_FIGHT;
    } else if (threats.length) {
      this.frontline.fight(threats, passives);

      const deployedBalance = calculateBalance(this.fighters, threats, true);

      if (deployedBalance > FIGHT_BALANCE) {
        this.mode = Battle.MODE_FIGHT;
      } else if (deployedBalance < RALLY_BALANCE) {
        this.mode = Battle.MODE_RALLY;
      }

      this.balance = calculateBalance(this.fighters, threats);
    } else {
      this.frontline.pillage(this.zone.threats);

      this.balance = this.fighters.length / (1 + this.zone.threats.size * 3);
      this.mode = Battle.MODE_FIGHT;
    }

    this.detector.priority = this.priority;
    for (const fighter of this.fighters) fighter.priority = this.priority;
  }

  close() {
    console.log("Battle", this.zone.name, "ends");

    this.zone.battle = null;
    this.detector.close(true);

    for (const job of this.fighters) {
      job.close(true);
    }
  }

}

function calculateBalance(fighters, threats, isDeployed) {
  let warriorDamage = 0;
  let warriorHealth = 0;
  let enemyDamage = 0;
  let enemyHealth = 0;

  for (const fighter of fighters) {
    const warrior = fighter.assignee;

    if (!warrior || !warrior.isAlive) continue;
    if (isDeployed && !fighter.isDeployed) continue;

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

function areMostFightersRallied(fighters, zones) {
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

  return deployed > rallying * 4;
}
