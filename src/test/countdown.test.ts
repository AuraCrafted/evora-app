import { describe, expect, it } from "vitest";
import { formatTimeLeft } from "@/lib/countdown";

describe("formatTimeLeft", () => {
  it("shows seconds so the countdown visibly ticks", () => {
    expect(formatTimeLeft(7_384_000)).toBe("2h 3m 4s");
    expect(formatTimeLeft(65_000)).toBe("1m 5s");
    expect(formatTimeLeft(9_000)).toBe("9s");
  });

  it("counts down one second at a time", () => {
    expect(formatTimeLeft(3_600_000)).toBe("1h 0m 0s");
    expect(formatTimeLeft(3_599_000)).toBe("59m 59s");
  });

  it("says soon once the day has rolled over", () => {
    expect(formatTimeLeft(0)).toBe("soon");
    expect(formatTimeLeft(-1000)).toBe("soon");
  });
});
