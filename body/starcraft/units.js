
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

export const LEADER_RANK = {
  10: 8, // mothership
  82: 7, // observer
  79: 6, // carrier
  77: 5, // sentry
  73: 4, // zealot
  74: 3, // stalker
  80: 2, // voidray
  78: 1, // phoenix
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

// The units that can't fight my army
export const DUMMY_TARGETS = {
  // Terran
  18: "command center",
  19: "supply depot",
  20: "refinery",
  21: "barracks",
  28: "starport",
  36: "flying command center",
  45: "scv",
  47: "supply depot lowered",
  268: "mule",

  // Protoss
  59: "nexus",
  60: "pylon",
  61: "assimilator",
  62: "gateway",
  63: "forge",
  64: "beacon",
  67: "stargate",
  71: "robotics",
  72: "cybernetics",
  82: "observer",
  84: "probe",

  // Zerg
  86: "hatchery",
  87: "creep tumor",
  88: "extractor",
  89: "spawning pool",
  97: "roach warren",
  100: "lair",
  101: "hive",
  103: "egg",
  104: "drone",
  106: "overlord",
  151: "larva",
};

export const LIGHT_WARRIORS = {
  105: "zergling",
};

export const HEAVY_WARRIORS = {
  66: "photon cannon",
};

export const STATIONARY_WARRIORS = {
  66: "photon cannon",
};
