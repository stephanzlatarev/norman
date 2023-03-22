
export const OWN_UNITS = {
  10: "mothership",
  59: "nexus",
  60: "pylon",
  61: "assimilator",
  62: "gateway",
  63: "forge",
  64: "beacon",
  67: "stargate",
  71: "robotics",
  72: "cybernetics",
  73: "zealot",
  74: "stalker",
  77: "sentry",
  78: "phoenix",
  79: "carrier",
  80: "voidray",
  82: "observer",
  84: "probe"
};

export const WARRIORS = {
  10: "mothership",
  73: "zealot",
  74: "stalker",
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

export const EXPLORERS = {
  73: "zealot",
  74: "stalker",
  77: "sentry",
  78: "phoenix",
  80: "voidray",
  82: "observer",
};

export const LEADER_RANK = {
  10: 8, // mothership
  77: 7, // sentry
  73: 6, // zealot
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
  48: "marine",
  49: "reaper",
  105: "zergling",
  107: "hydralisk",
  110: "roach",
  126: "queen",
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
  889: "stargate",
  893: "robotics",
  894: "cybernetics",
  916: "zealot",
  917: "stalker",
  921: "sentry",
  946: "phoenix",
  948: "carrier",
  950: "voidray",
  977: "observer",
  1006: "probe",
  3692: "airArmor",
  3693: "airWeapons",
  3694: "groundArmor",
  3695: "groundWeapons",
  3696: "shields",
};
