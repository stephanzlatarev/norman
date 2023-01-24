
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
      sentries: input[17],
      probes: input[19],
    };

    const progress = {
      nexuses: input[4],
      pylons: input[6],
      assimilators: input[8],
      gateways: input[10],
      cybernetics: input[12],
      zealots: input[14],
      stalkers: input[16],
      sentries: input[18],
      probes: input[20],
    };

    const order = {
      nexuses: -1,
      pylons: -1,
      assimilators: -1,
      gateways: -1,
      cybernetics: -1,
      zealots: -1,
      stalkers: -1,
      sentries: -1,
      probes: -1,
    };

    const nexuses = complete.nexuses + progress.nexuses;
    const pylons = complete.pylons + progress.pylons;
    const assimilators = complete.assimilators + progress.assimilators;
    const gateways = complete.gateways + progress.gateways;
    const cybernetics = complete.cybernetics + progress.cybernetics;
    const zealots = complete.zealots + progress.zealots;
    const stalkers = complete.stalkers + progress.stalkers;
    const sentries = complete.sentries + progress.sentries;
    const probes = complete.probes + progress.probes;

    let foodFree = complete.nexuses * 15 + complete.pylons * 8 - foodUsed;

    // First priority is pylons
    const foodThreshold = complete.nexuses * 15 + pylons * 8 - 10;
    if (!progress.pylons &&
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

    // Next priority is cybernetic cores
    if (!cybernetics && (minerals >= 200) && (complete.zealots > 0)) {
      order.cybernetics = 1;
      minerals -= 200;
    }

    // Next priority is gateways
    if (!progress.gateways && (nexuses > 1) && (minerals >= 150) && (gateways < nexuses * 2)) {
      order.gateways = 1;
      minerals -= 150;
    }

    // Next priority is assimilators
    if (!progress.assimilators && (minerals >= 75) && (minerals > vespene) && (gateways > 0) && (nexuses > 1) && (assimilators < complete.nexuses * 2)) {
      order.assimilators = 1;
      minerals -= 75;
    }

    // Next priority is probes
    if ((progress.probes < nexuses - progress.nexuses) && (probes < 82) && (minerals >= 50) && foodFree) {
      order.probes = 1;
      minerals -= 50;
      foodFree -= 1;
    }

    // Next priority is land combat units
    if (complete.gateways && (progress.zealots + progress.stalkers + progress.sentries < complete.gateways)) {
      const unit = selectGatewayUnit(
        zealots, 2,
        stalkers, (complete.cybernetics && complete.assimilators && (sentries >= 2)) ? 6 : 0,
        sentries, (complete.cybernetics && complete.assimilators) ? 1 : 0,
      );

      if (unit === "stalker") {
        if ((minerals >= 125) && (vespene >= 50) && (foodFree >= 2)) {
          order.stalkers = 1;
          minerals -= 125;
          vespene -= 50;
          foodFree -= 2;
        }
      } else if (unit === "sentry") {
        if ((minerals >= 50) && (vespene >= 100) && (foodFree >= 2)) {
          order.sentries = 1;
          minerals -= 50;
          vespene -= 100;
          foodFree -= 2;
        }
      } else if (unit === "zealot") {
        if ((minerals >= 100) && (foodFree >= 2)) {
          order.zealots = 1;
          minerals -= 100;
          foodFree -= 2;
        }
      }
    }

    return [
      1, 1,
      order.nexuses, order.nexuses,
      order.pylons, order.pylons,
      order.assimilators, order.assimilators,
      order.gateways, order.gateways,
      order.cybernetics, order.cybernetics,
      order.zealots, order.zealots,
      order.stalkers, order.stalkers,
      order.sentries, order.sentries,
      order.probes, order.probes,
    ];
  }

}

function selectGatewayUnit(zealots, zealotsRatio, stalkers, stalkersRatio, sentries, sentriesRatio) {
  if (stalkersRatio && (!zealotsRatio || (stalkers * zealotsRatio <= zealots * stalkersRatio)) && (!sentriesRatio || (stalkers * sentriesRatio <= sentries * stalkersRatio))) {
    return "stalker";
  } else if (sentriesRatio && (!zealotsRatio || (sentries * zealotsRatio <= zealots * sentriesRatio))) {
    return "sentry";
  } else {
    return "zealot";
  }
}
