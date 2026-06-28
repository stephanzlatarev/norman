import autoOracle from "./auto-oracle.js";
import autoTempest from "./auto-tempest.js";
import autoVoidrays from "./auto-voidrays.js";
import assassins from "./assassins.js";
import blinkStalker from "./blink-stalker.js";
import castGuardianShield from "./cast-guardian-shield.js";

export default function() {
  autoOracle();
  autoTempest();
  autoVoidrays();
  assassins();
  blinkStalker();
  castGuardianShield();
}
