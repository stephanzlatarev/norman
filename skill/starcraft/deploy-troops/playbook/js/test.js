import sample from "./defend.js";
import display from "./js/display.js";

for (let i = 0; i < 7; i++) {
  const it = sample();

  display([...it.input, ...it.output], 10, 10);
}
