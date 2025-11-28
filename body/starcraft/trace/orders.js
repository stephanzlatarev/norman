
let show = true;

export default function(...line) {
  if (!show) return;

  console.log(...line);
}

export function toggle(flag) {
  show = !!flag;
}
