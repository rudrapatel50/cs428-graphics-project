import seedrandom from "seedrandom";

let rng = Math.random;

export function seedRandom(seed) {
  rng = seedrandom(seed);
}

export function random() {
  return rng();
}