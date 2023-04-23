
export default class Brain {

  react(distanceToNexus, selectedDistanceToNexus) {
    if (!selectedDistanceToNexus || (distanceToNexus > selectedDistanceToNexus)) {
      return [1, distanceToNexus];
    }
  }

}
