
const PRIO = {
   110: 61, // mothership

  3692: 52, // air armor
  1565: 52, // air armor level 1
  1566: 52, // air armor level 2
  1567: 52, // air armor level 3
  3693: 51, // air weapons
  1562: 51, // air weapons level 1
  1563: 51, // air weapons level 2
  1564: 51, // air weapons level 3

  3694: 43, // ground armor
  1065: 43, // ground armor level 1
  1066: 43, // ground armor level 2
  1067: 43, // ground armor level 3
  3695: 42, // ground weapons
  1062: 42, // ground weapons level 1
  1063: 42, // ground weapons level 2
  1064: 42, // ground weapons level 3
  3696: 41, // shields
  1068: 41, // shields level 1
  1069: 41, // shields level 2
  1070: 41, // shields level 3

  1006: 31, // probe
   948: 23, // carrier
   950: 22, // void ray
   946: 21, // phoenix
   921: 13, // sentry
   917: 12, // stalker
   916: 11, // zealot
};

export default class Brain {

  react(input) {
    const target = input[0];
    const boost = input[1];
    const order = input[2];
    const alternative = input[3];

    const prioOfSelection = input[5];

    if (alternative && (alternative !== target)) {
      return;
    }

    if (!boost && order) {
      const prio = PRIO[order];

      if (!prioOfSelection || (prio > prioOfSelection)) {
        return [1, prio];
      }
    }
  }

}
