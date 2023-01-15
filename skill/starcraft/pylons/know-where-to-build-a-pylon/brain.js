
const POSITIVE_PYLON_STEP = [0, 7, 1, 6, 2, 5, 3, 4];
const NEGATIVE_PYLON_STEP = [0, 1, 7, 2, 6, 3, 5, 4];

export default class Brain {

  react(input) {
    const x = input[0];
    const y = input[1];
    const sector = input[2];
    const side = input[3];
    const pylons = input[4];

    const step = (side > 0) ? POSITIVE_PYLON_STEP : NEGATIVE_PYLON_STEP;
    const slot = (sector + step[pylons]) % 8;

    switch (slot) {
      case 0: return [1, x + 1.5, y + 3.5];
      case 1: return [1, x + 3.5, y + 1.5];
      case 2: return [1, x + 3.5, y - 1.5];
      case 3: return [1, x + 1.5, y - 3.5];
      case 4: return [1, x - 1.5, y - 3.5];
      case 5: return [1, x - 3.5, y - 1.5];
      case 6: return [1, x - 3.5, y + 1.5];
      case 7: return [1, x - 1.5, y + 3.5];
    }
  }

}

/*

 7 7 7 7 7 7 7#7#7#7#0#0#0#0#0#0 0 0 0 0 0
 6 7 7 7 7 7 7 7#7#7#0#0#0#0#0 0 0 0 0 0 1
 6 6 7 7 7 7 7 7#7#7#0#0#0#0#0 0 0 0 0 1 1
 6 6 6 7 7 7 7 7 7#7#0#0#0#0 0 0 0 0 1 1 1
 6 6 6 6 7 7 7 7 7#7#0#0#0#0 0 0 0 1 1 1 1
 6 6 6 6 6 7 7 7 7#7#0#0#0#0 0 0 1 1 1 1 1
 6#6 6 6 6 6 7 7 7 7#0#0#0 0 0 1 1 1 1 1 1#
 6#6#6#6 6 6 6 7 7 7#0#0#0 0 1 1 1 1 1#1#1#
 6#6#6#6#6#6#6 6 7 7 0#0 0 1 1 1#1#1#1#1#1#
 6#6#6#6#6#6#6#6#6 7 0#0 1 1#1#1#1#1#1#1#1#
 6#6#6#6#6#6#6#6#6#6#0 1#1#1#1#1#1#1#1#1#1#
 5#5#5#5#5#5#5#5#5 4 3#3 2 2#2#2#2#2#2#2#2#
 5#5#5#5#5#5#5 5 4 4 3#3 3 2 2 2#2#2#2#2#2#
 5#5#5#5 5 5 5 4 4 4#3#3#3 3 2 2 2 2 2#2#2#
 5#5 5 5 5 5 4 4 4 4#3#3#3 3 3 2 2 2 2 2 2#
 5 5 5 5 5 4 4 4 4#4#3#3#3#3 3 3 2 2 2 2 2
 5 5 5 5 4 4 4 4 4#4#3#3#3#3 3 3 3 2 2 2 2
 5 5 5 4 4 4 4 4 4#4#3#3#3#3 3 3 3 3 2 2 2
 5 5 4 4 4 4 4 4#4#4#3#3#3#3#3 3 3 3 3 2 2
 5 4 4 4 4 4 4 4#4#4#3#3#3#3#3 3 3 3 3 3 2
 4 4 4 4 4 4 4#4#4#4#3#3#3#3#3#3 3 3 3 3 3

*/