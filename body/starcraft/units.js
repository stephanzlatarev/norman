
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

// Units with attack or defense functions
export const IS_MILITARY = {
   4: "colossus",
   7: "infestor terran",
   8: "baneling cocoon",
   9: "baneling",
  10: "mothership",
  12: "changeling",
  13: "changeling zealot",
  14: "changeling marine shield",
  15: "changeling marine",
  16: "changeling zergling wings",
  17: "changeling zergling",
  23: "missile turret",
  24: "bunker",
  31: "auto turret",
  32: "siege tank sieged",
  33: "siege tank",
  34: "viking assualt",
  35: "viking fighter",
  48: "marine",
  49: "reaper",
  50: "ghost",
  51: "marauder",
  52: "thor",
  53: "hellion",
  54: "medivac",
  55: "banshee",
  56: "raven",
  57: "battle cruiser",
  66: "photon cannon",
  73: "zealot",
  74: "stalker",
  75: "high templar",
  76: "dark templar",
  77: "sentry",
  78: "phoenix",
  79: "carrier",
  80: "voidray",
  81: "warp prism",
  82: "observer",
  83: "immortal",
  85: "interseptor",
  95: "nidus network",
  98: "spine crawler",
  99: "spore crawler",
  105: "zergling",
  106: "overlord",
  107: "hydralisk",
  108: "mutalisk",
  109: "ultralisk",
  110: "roach",
  111: "infestor",
  112: "corruptor",
  113: "brood lord cocoon",
  114: "brood lord",
  115: "baneling burrowed",
  117: "hydralisk burrowed",
  118: "roach burrowed",
  119: "zergling burrowed",
  125: "queen burrowed",
  126: "queen",
  127: "infestor burrowed",
  128: "overlord cocoon",
  129: "overseer",
  130: "planetary fortress",
  136: "warp prism phasing",
  139: "spine crawler uprooted",
  140: "spore crawler uprooted",
  141: "archon",
  142: "nidus canal",
  289: "broodling",
  311: "adept",
  484: "hellion tank",
  488: "mothership core",
  489: "locust mp",
  493: "swarm host mp burrowed",
  494: "swarm host mp",
  495: "oracle",
  496: "tempest",
  498: "widow mine",
  499: "viper",
  501: "lurker mp egg",
  502: "lurker mp",
  503: "lurker mp burrowed",
  500: "widow mine burrowed",
  687: "ravager cacoon",
  688: "ravager",
  689: "liberator",
  691: "thor ap",
  692: "cyclone",
  693: "locust mp flying",
  694: "disruptor",
  732: "oracle stasis trap",
  733: "disruptor phased",
  734: "liberator ag",
  801: "adept phase shift",
  892: "overlord transport cocoon",
  893: "overlord transport",
  894: "pylon overcharged",
  1910: "shield battery",
};
