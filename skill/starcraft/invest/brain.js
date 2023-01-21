
export default class Brain {

  react(input) {
    let minerals = input[0];
    let vespene = input[1];
    let foodUsed = input[2];

    const complete = {
      nexuses: input[3],
      pylons: input[5],
      assimilators: input[7],
      gateways: input[9],
      cybernetics: input[11],
      zealots: input[13],
      stalkers: input[15],
      probes: input[17],
    };

    const progress = {
      nexuses: input[4],
      pylons: input[6],
      assimilators: input[8],
      gateways: input[10],
      cybernetics: input[12],
      zealots: input[14],
      stalkers: input[16],
      probes: input[18],
    };

    const order = {
      nexuses: -1,
      pylons: -1,
      assimilators: -1,
      gateways: -1,
      cybernetics: -1,
      zealots: -1,
      stalkers: -1,
      probes: -1,
    };

    const nexuses = complete.nexuses + progress.nexuses;
    const pylons = complete.pylons + progress.pylons;
    const assimilators = complete.assimilators + progress.assimilators;
    const gateways = complete.gateways + progress.gateways;
    const cybernetics = complete.cybernetics + progress.cybernetics;
    const zealots = complete.zealots + progress.zealots;
    const stalkers = complete.stalkers + progress.stalkers;
    const probes = complete.probes + progress.probes;

    let foodFree = complete.nexuses * 15 + complete.pylons * 8 - foodUsed;

    // First priority is pylons
    const foodThreshold = nexuses * 15 + pylons * 8 - 10;
    if (!progress.nexuses &&
      (minerals >= 100) && (foodUsed >= foodThreshold) && (pylons < nexuses * 6) &&
      ((pylons < 1) || ((nexuses >= 2) && (gateways >= 1))) // Don't build a second pylon before the second nexus and first gateway are started 
    ) {
      order.pylons = 1;
      minerals -= 100;
    }

    // Next priority is nexuses
    if (!progress.nexuses && (minerals >= 300) && (nexuses <= pylons)) {
      order.nexuses = 1;
      minerals -= 400;
    }

    // Next priority is gateways
    if (!progress.gateways && (nexuses > 1) && (minerals >= 150) && (gateways < nexuses * 2)) {
      order.gateways = 1;
      minerals -= 150;
    }

    // Next priority is assimilators
    if (!progress.assimilators && (minerals >= 75) && (gateways > 0) && (nexuses > 1) && (assimilators < complete.nexuses * 2)) {
      order.assimilators = 1;
      minerals -= 75;
    }

    // Next priority is cybernetic cores
    if (!cybernetics && !progress.cybernetics && (minerals >= 200) && (complete.zealots > 1)) {
      order.cybernetics = 1;
      minerals -= 200;
    }

    // Next priority is probes
    if ((progress.probes < nexuses - progress.nexuses) && (probes < 64) && (minerals >= 50) && foodFree) {
      order.probes = 1;
      minerals -= 50;
      foodFree -= 1;
    }

    let reservations = 0;

    // Next priority is stalkers
    if (complete.cybernetics && (vespene >= 50)) {
      while ((progress.zealots + progress.stalkers + order.stalkers + reservations < complete.gateways) && (vespene >= 50) && (foodFree >= 2)) {
        if (minerals >= 125) {
          order.stalkers = (order.stalkers > 0) ? order.stalkers + 1 : 1;
        } else {
          reservations++;
        }
        minerals -= 125;
        minerals -= 50;
        foodFree -= 2;

        if (reservations > 2) break;
      }
    }

    // Next priority is stalkers
    if ((progress.zealots + progress.stalkers + order.stalkers + reservations < complete.gateways) && (minerals >= 100) && (foodFree >= 2)) {
      order.zealots = 1;
      minerals -= 100;
      foodFree -= 2;
    }

    return [
      1, 1,
      order.nexuses, order.pylons, order.assimilators,
      order.gateways, order.cybernetics,
      order.zealots, order.stalkers, order.probes,
    ];
  }

}
