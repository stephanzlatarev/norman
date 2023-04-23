
export const LOOPS_PER_STEP = 2;
export const LOOPS_PER_SECOND = 22.4;
export const STEPS_PER_SECOND = LOOPS_PER_SECOND / LOOPS_PER_STEP;

export const RESOURCES = { 
  146: "mineral", 147: "mineral", 341: "mineral", 483: "mineral",
  665: "mineral", 666: "mineral", 796: "mineral", 797: "mineral",
  884: "mineral", 885: "mineral", 886: "mineral", 887: "mineral",
  1996: "mineral", 1997: "mineral", 1998: "mineral",
  342: "vespene", 343: "vespene", 344: "vespene",
  608: "vespene", 880: "vespene", 881: "vespene",
};

export const OWN_UNITS = {
   0: "base",
  10: "mothership",
  59: "nexus",
  60: "pylon",
  61: "assimilator",
  62: "gateway",
  63: "forge",
  64: "beacon",
  65: "council",
  67: "stargate",
  69: "shrine",
  71: "robotics",
  72: "cybernetics",
  73: "zealot",
  74: "stalker",
  76: "templar",
  77: "sentry",
  78: "phoenix",
  79: "carrier",
  80: "voidray",
  82: "observer",
  84: "probe"
};

export const CLASS = {
  10: "unit",
  59: "building",
  60: "building",
  61: "building",
  62: "building",
  63: "building",
  64: "building",
  65: "building",
  67: "building",
  69: "building",
  71: "building",
  72: "building",
  73: "unit",
  74: "unit",
  76: "unit",
  77: "unit",
  78: "unit",
  79: "unit",
  80: "unit",
  82: "unit",
  84: "unit"
};

export const WARRIORS = {
  10: "mothership",
  73: "zealot",
  74: "stalker",
  76: "templar",
  77: "sentry",
  78: "phoenix",
  79: "carrier",
  80: "voidray",
  82: "observer",
};

export const WORKERS = {
  45: "scv",
  84: "probe",
  104: "drone",
  268: "mule",
};

export const SCOUTS = {
  73: "zealot",
  74: "stalker",
  76: "templar",
  77: "sentry",
  78: "phoenix",
  80: "voidray",
  82: "observer",
};

export const LEADER_RANK = {
  10: 8, // mothership
  77: 7, // sentry
  73: 6, // zealot
  76: 5, // templar
  74: 5, // stalker
  82: 4, // observer
  79: 3, // carrier
  80: 2, // voidray
  78: 1, // phoenix
  84: 1, // probe
};

export const USES_ENERGY = {
  10: "mothership",
  77: "sentry",
};

export const CAN_HIT_AIR = {
  10: "mothership",
  74: "stalker",
  77: "sentry",
  78: "phoenix",
  79: "carrier",
  80: "voidray",
};

export const BOOSTABLE = {
  59: "nexus",
  62: "gateway",
  63: "forge",
  67: "stargate",
  71: "robotics",
  72: "cybernetics",
};

export const ENEMY_UNITS = {
  24: "bunker",
  32: "tank",
  33: "tank",
  48: "marine",
  49: "reaper",
  51: "marauder",
  105: "zergling",
  107: "hydralisk",
  110: "roach",
  126: "queen",
  692: "cyclone",
};

export const UNIT_RACE = {
  24: 1,
  32: 1,
  33: 1,
  48: 1,
  49: 1,
  51: 1,
  105: 2,
  107: 2,
  110: 2,
  126: 2,
  692: 1,
};

// The units that can't fight my army
export const DUMMY_TARGETS = {
  // Terran
  18: "command center",
  19: "supply depot",
  20: "refinery",
  21: "barracks",
  22: "engineering bay",
  25: "sensor tower",
  27: "factory",
  28: "starport",
  30: "fussion core",
  36: "flying command center",
  38: "barracks reactor",
  39: "factory techlab",
  40: "factory reactor",
  41: "starport techlab",
  42: "starport reactor",
  43: "factory flying",
  44: "starport flying",
  46: "barracks flying",
  47: "supply depot lowered",
  132: "orbital command",
  134: "orbital command flying",

  // Protoss
  59: "nexus",
  60: "pylon",
  61: "assimilator",
  62: "gateway",
  63: "forge",
  64: "beacon",
  65: "twilight council",
  67: "stargate",
  69: "dark shrine",
  68: "templar archive",
  69: "dark shrine",
  70: "robotics bay",
  71: "robotics facility",
  72: "cybernetics",
  82: "observer",
  133: "warp gate",

  // Zerg
  86: "hatchery",
  87: "creep tumor",
  88: "extractor",
  89: "spawning pool",
  97: "roach warren",
  100: "lair",
  101: "hive",
  103: "egg",
  106: "overlord",
  137: "creep tumor burrowed",
  138: "creep tumor queen",
  151: "larva",
};

export const LIGHT_WARRIORS = {
  48: "marine",
  105: "zergling",
};

export const HEAVY_WARRIORS = {
  24: "bunker",
  32: "siege tank",
  33: "siege tank sieged",
  66: "photon cannon",
};

export const STATIONARY_WARRIORS = {
  66: "photon cannon",
};

export const ORDERS = {
  110: "mothership",
  880: "nexus",
  881: "pylon",
  882: "assimilator",
  883: "gateway",
  884: "forge",
  885: "beacon",
  886: "council",
  889: "stargate",
  891: "shrine",
  893: "robotics",
  894: "cybernetics",
  916: "zealot",
  917: "stalker",
  920: "templar",
  921: "sentry",
  946: "phoenix",
  948: "carrier",
  950: "voidray",
  977: "observer",
  1006: "probe",
  1062: "groundWeapons",
  1063: "groundWeapons",
  1064: "groundWeapons",
  1065: "groundArmor",
  1066: "groundArmor",
  1067: "groundArmor",
  1068: "shields",
  1069: "shields",
  1070: "shields",
  1562: "airWeapons",
  1563: "airWeapons",
  1564: "airWeapons",
  1565: "airArmor",
  1566: "airArmor",
  1567: "airArmor",
  3692: "airArmor",
  3693: "airWeapons",
  3694: "groundArmor",
  3695: "groundWeapons",
  3696: "shields",
};

export const ACTIONS_LABELS = {
  ...ORDERS,
    16: "move",
    76: "use-guardian-shield",
   298: "harvest",
  2244: "time-warp",
  3690: "set-rally-point",
  3755: "chronoboost",
  3674: "attack",
}

export const ACTIONS = {
  "cybernetics": {
    "airArmor": 3692,
    "airWeapons": 3693,
  },
  "forge": {
    "groundArmor": 3694,
    "groundWeapons": 3695,
    "shields": 3696,
  },
  "gateway": {
    "zealot": 916,
    "stalker": 917,
    "templar": 920,
    "sentry": 921,
  },
  "mothership": {
    "time-warp": 2244,
  },
  "nexus": {
    "chronoboost": 3755,
    "probe": 1006,
    "mothership": 110,
    "set-rally-point": 3690,
  },
  "probe": {
    "nexus": 880,
    "base": 881,
    "pylon": 881,
    "assimilator": 882,
    "gateway": 883,
    "forge": 884,
    "beacon": 885,
    "council": 886,
    "stargate": 889,
    "shrine": 891,
    "robotics": 893,
    "cybernetics": 894,
  },
  "robotics": {
    "observer": 977,
  },
  "sentry": {
    "use-guardian-shield": 76,
  },
  "stargate": {
    "phoenix": 946,
    "carrier": 948,
    "voidray": 950,
  }
};

export const ACTION_TARGET = {
  "scout": "location",
  "move": "location",
  "set-rally-point": "location",
  "nexus": "location",
  "pylon": "location",
  "gateway": "location",
  "forge": "location",
  "beacon": "location",
  "council": "location",
  "stargate": "location",
  "shrine": "location",
  "robotics": "location",
  "cybernetics": "location",
  "attack": "location",
  "assimilator": "unit",
  "chronoboost": "unit",
};

export const IS_PRODUCED_BY = {
  "mothership": "nexus",
  "zealot": "gateway",
  "stalker": "gateway",
  "templar": "gateway",
  "sentry": "gateway",
  "phoenix": "stargate",
  "carrier": "stargate",
  "voidray": "stargate",
  "observer": "robotics",
  "probe": "nexus",
  "airWeapons": "cybernetics",
  "airArmor": "cybernetics",
  "groundWeapons": "forge",
  "groundArmor": "forge",
  "shields": "forge",
};
