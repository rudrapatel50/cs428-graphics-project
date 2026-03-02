import { describe, it, expect } from "vitest";
import { seedRandom, random } from "./index.js";

describe("seedRandom", () => {
  it("produces deterministic output for the same seed", () => {
    seedRandom("my-seed");
    const a = [random(), random(), random()];

    seedRandom("my-seed");
    const b = [random(), random(), random()];

    expect(a).toEqual(b);
  });

  it("produces different output for different seeds", () => {
    seedRandom("seed-A");
    const a = random();

    seedRandom("seed-B");
    const b = random();

    expect(a).not.toEqual(b);
  });
});