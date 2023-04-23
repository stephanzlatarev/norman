import { BOOSTABLE, CLASS, ORDERS, OWN_UNITS, SCOUTS } from "../units.js";

export function observeUnits(model, observation) {
  if (!model.unitMonitors) {
    model.unitMonitors = {};

    for (const type in OWN_UNITS) {
      const unit = OWN_UNITS[type];

      model.unitMonitors[unit] = model.memory.pattern({
        nodes: {
          PRODUCER: { isProducer: true },
          UNIT: { isUnitType: true, label: unit }
        },
        paths: [
          [ "PRODUCER", "produce", "UNIT" ]
        ],
        infos: [
          { node: "PRODUCER" }
        ]
      });
    }
  }
  if (!model.unitImages) {
    model.unitImages = {};
  }

  const images = [];
  const missingUnits = {...model.unitImages};

  const unitsReady = createBuildCountTable();
  const unitsBuilding = createBuildCountTable();
  const unitsOrdered = createBuildCountTable();

  unitsReady.groundWeapons = getUpgradeLevel(observation, 39, 40, 41);
  unitsReady.groundArmor = getUpgradeLevel(observation, 42, 43, 44);
  unitsReady.shields = getUpgradeLevel(observation, 45, 46, 47);
  unitsReady.airWeapons = getUpgradeLevel(observation, 78, 79, 80);
  unitsReady.airArmor = getUpgradeLevel(observation, 81, 82, 83);

  for (const unit of observation.ownUnits) {
    let unitType = OWN_UNITS[unit.unitType];
    if (!unitType || !unit.buildProgress) continue;

    const image = model.add(unit.tag);

    // Remember units to track dead units
    model.unitImages[unit.tag] = image;
    delete missingUnits[unit.tag];

    // Some pylons are bases
    if (image.get("type:base")) unitType = "base";

    image.set("tag", Number(unit.tag));
    image.set("isUnit", true);
    image.set("class", model.add(CLASS[unit.unitType]));
    image.set("type", model.add(unitType));
    image.set("type:" + unitType, true);

    image.set("operational", unit.buildProgress >= 1);
    image.set("orders", unit.orders.length);
    image.set("energy", unit.energy);

    image.set("x", unit.pos.x);
    image.set("y", unit.pos.y);

    if (unit.buildProgress < 1) {
      unitsBuilding[unitType]++;
    } else {
      unitsReady[unitType]++;
    }

    if (unit.orders.length) {
      if (unitType === "probe") {
        const productType = model.add(unit.tag).get("produceUnitType");

        if (productType) {
          unitsBuilding[productType.label]++;
        }
      } else {
        for (const order of unit.orders) {
          const orderType = ORDERS[order.abilityId];
  
          if (orderType) {
            unitsBuilding[orderType]++;
          }
        }
      }

      image.set("orderAbilityId", unit.orders[0].abilityId);

      const targetUnitTag = unit.orders[0].targetUnitTag;
      if (targetUnitTag) {
        image.set("orderTargetUnit", model.add(targetUnitTag));
      }
    } else {
      image.set("orderAbilityId", false);
      image.set("orderTargetUnit", false);
    }

    if (BOOSTABLE[unit.unitType]) {
      image.set("boostable", true).set("boost", getBoostPercentage(unit));
    }

    if (SCOUTS[unit.unitType]) {
      image.set("type:scout", true);
    }

    // Handle special cases
    if (unitType === "assimilator") {
      image.set("isUtilized", (unit.assignedHarvesters >= unit.idealHarvesters));
      image.set("isDepleted", (unit.vespeneContents <= 0));
    } else if (unitType === "sentry") {
      image.set("canUseGuardianShield", unit.energy > 75);
      image.set("guardian-shield", !!unit.buffIds.length);
    } else if (unitType === "mothership") {
      image.set("canUseTimeWarp", unit.energy > 100);
    } else if (unitType === "nexus") {
      image.set("canUseChronoboost", unit.energy > 50);
    }

    images.push(image);
  }

  // Count orders in memory
  for (const unitType in model.unitMonitors) {
    if (model.unitMonitors[unitType].hasMatches()) {
      unitsOrdered[unitType]++;
    }
  }

  updateMemoryWithBuildCountTable(model, "Units ready", unitsReady);
  updateMemoryWithBuildCountTable(model, "Units building", unitsBuilding);
  updateMemoryWithBuildCountTable(model, "Units ordered", unitsOrdered);

  // Remove dead units
  for (const tag in missingUnits) {
    const image = model.unitImages[tag];

    if (image.get("type:probe") && image.get("isVespeneHarvester") && (image.get("orderAbilityId") === 298)) {
      // Harvesters temporarily disappear in assimilators
      // TODO: Check for them in a few loops. If they don't reappear, they've been killed
      continue;
    }

    if (image.get("type:probe") && image.get("produceAt")) {
      const location = image.get("produceAt");
      if (!location.get("type")) {
        model.memory.remove(location);
      }
    }

    delete model.unitImages[tag];
    model.memory.remove(image);
  }

  return images;
}

function createBuildCountTable() {
  const table = { groundWeapons: 0, groundArmor: 0, airWeapons: 0, airArmor: 0, shields: 0 };
  for (const unit in OWN_UNITS) table[OWN_UNITS[unit]] = 0;
  return table;
}

function updateMemoryWithBuildCountTable(model, label, table) {
  const node = model.add(label);

  for (const key in table) {
    node.set(key, table[key]);
  }
}

function getUpgradeLevel(observation, level1, level2, level3) {
  const levels = observation.rawData.player.upgradeIds;
  if (levels.indexOf(level3) >= 0) return 3;
  if (levels.indexOf(level2) >= 0) return 2;
  if (levels.indexOf(level1) >= 0) return 1;
  return 0;
}

function getBoostPercentage(unit) {
  if (unit.buffDurationMax && unit.buffIds.length && (unit.buffIds[0] === 281)) {
    return unit.buffDurationRemain * 100 / unit.buffDurationMax; 
  }

  return 0;
}
