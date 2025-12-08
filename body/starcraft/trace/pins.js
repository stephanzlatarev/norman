import Memory from "../../../code/memory.js";

export default function(shapes) {
  if (Memory.PinNextExpansionX && Memory.PinNextExpansionY) {
    shapes.push({ shape: "circle", x: Memory.PinNextExpansionX, y: Memory.PinNextExpansionY, r: 3.5, color: "purple" });
  }
}
