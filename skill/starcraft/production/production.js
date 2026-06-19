import chronoboost from "./chronoboost.js";
import buildExpansions from "./build-expansions.js";
import buildExtractors from "./build-extractors.js";
import buildFacilities from "./build-facilities.js";
import buildShieldBatteries from "./build-shield-batteries.js";
import buildWarriors from "./build-warriors.js";
import researchUpgrades from "./research-upgrades.js";

export default function() {
  buildExpansions();
  buildExtractors();
  buildFacilities();
  buildShieldBatteries();
  buildWarriors();
  researchUpgrades();
  chronoboost();
}
