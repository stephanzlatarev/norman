// A buffer distance (in tiles) around what we protect, our warriors, and the engagement border.
const THREAT_RANGE = 8;

// An Area describes three nested regions of a hotspot, all sharing the zone center (x, y):
// - protect: the circle enclosing the zone of the hotspot. The area we want to protect or attack.
// - engage:  the circle of THREAT_RANGE buffer around the protect area plus the `engage` link circles toward the rally.
//            Our warriors move within it and are considered deployed; enemy contacts are counted here.
// - threat:  the engage area plus the `threat` circles buffering our warriors at its edge.
//            Enemy threats are counted here. A warrior deep inside the engage area does not extend it.
export default class Area {

  constructor(zone) {
    this.x = zone.circle.x;
    this.y = zone.circle.y;
    this.r = zone.circle.r;
    this.engage = []; // Circles toward the rally
    this.threat = []; // Circles around our edge warriors
    this.horizon = new Set(zone.horizon);
  }

  // Add a link circle connecting the circle of this zone to its backward neighbour.
  extendEngageArea(zone) {
    const back = zone.backward;
    const from = zone.circle;
    const to = back.circle;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > from.r) {
      const k = from.r / distance;

      this.engage.push({
        x: from.x + dx * k,
        y: from.y + dy * k,
        r: (distance - from.r) + THREAT_RANGE,
      });
    }

    for (const sector of back.horizon) this.horizon.add(sector);
  }

  // Extend the threat area with a THREAT_RANGE circle around each warrior at the edge of the engagement area.
  // A warrior deeper than THREAT_RANGE inside the engagement area is already covered and does not extend it.
  extendThreatArea(warriors) {
    for (const warrior of warriors) {
      if (!isWarriorCovered(this, warrior)) {
        this.threat.push({ x: warrior.body.x, y: warrior.body.y, r: THREAT_RANGE });
      }
    }
  }

  listDeployedWarriors() {
    const warriors = new Set();

    for (const sector of this.horizon) {
      for (const warrior of sector.warriors) {
        if (this.isInsideEngageArea(warrior)) warriors.add(warrior);
      }
    }

    return warriors;
  }

  listEnemyThreats() {
    const threats = [];

    for (const sector of this.horizon) {
      for (const threat of sector.threats) {
        if (this.isInsideThreatArea(threat)) threats.push(threat);
      }
    }

    return threats;
  }

  listEnemyContacts() {
    const contacts = [];

    for (const sector of this.horizon) {
      for (const contact of sector.contacts) {
        if (this.isInsideEngageArea(contact)) contacts.push(contact);
      }
    }

    return contacts;
  }

  // The circles making up each nested area, for visualization
  circles() {
    return {
      protect: [{ x: this.x, y: this.y, r: this.r }],
      engage: [{ x: this.x, y: this.y, r: this.r + THREAT_RANGE }, ...this.engage],
      threat: this.threat,
    };
  }

  isInsideProtectArea(unit) {
    const body = unit.body || unit;
    if (!body) return false;

    return within(body, this.x, this.y, this.r);
  }

  isInsideEngageArea(unit) {
    const body = unit.body || unit;
    if (!body) return false;

    if (within(body, this.x, this.y, this.r + THREAT_RANGE)) return true;
    for (const circle of this.engage) if (within(body, circle.x, circle.y, circle.r)) return true;

    return false;
  }

  isInsideThreatArea(unit) {
    if (this.isInsideEngageArea(unit)) return true;

    const body = unit.body || unit;
    if (!body) return false;

    for (const circle of this.threat) if (within(body, circle.x, circle.y, circle.r)) return true;

    return false;
  }

}

// A warrior is covered when it lies deep inside the engagement area.
function isWarriorCovered(area, warrior) {
  if (area.isInsideProtectArea(warrior)) return true;

  for (const circle of area.engage) {
    const r = circle.r - THREAT_RANGE;

    if (r <= 0) continue;
    if (within(warrior.body, circle.x, circle.y, r)) return true;
  }

  return false;
}

function within(body, x, y, r) {
  const dx = body.x - x;
  const dy = body.y - y;

  return (dx * dx + dy * dy) <= (r * r);
}
