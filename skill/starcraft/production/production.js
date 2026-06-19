import chronoboost from "./chronoboost.js";
import buildExpansions from "./build-expansions.js";
import buildExtractors from "./build-extractors.js";
import buildFacilities from "./build-facilities.js";
import buildPylons from "./build-pylons.js";
import buildShieldBatteries from "./build-shield-batteries.js";
import buildWarriors from "./build-warriors.js";
import researchUpgrades from "./research-upgrades.js";
import speedUpShieldBattery from "./speed-up-shield-battery.js";
import speedUpTechTree from "./speed-up-tech-tree.js";

export default function() {
  speedUpShieldBattery();
  speedUpTechTree();
  chronoboost();

  buildExpansions();
  buildExtractors();
  buildFacilities();
  buildPylons();
  buildShieldBatteries();

  buildWarriors();

  researchUpgrades();
}
