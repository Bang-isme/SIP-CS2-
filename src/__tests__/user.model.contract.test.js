import { jest } from "@jest/globals";

const mockCompare = jest.fn();
const mockGenSalt = jest.fn(async () => "salt");
const mockHash = jest.fn(async () => "hash");

jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    compare: mockCompare,
    genSalt: mockGenSalt,
    hash: mockHash,
  },
}));

const { default: User } = await import("../models/User.js");

describe("user model contract", () => {
  beforeEach(() => {
    mockCompare.mockReset();
  });

  it("static comparePassword fails closed when bcrypt throws", async () => {
    mockCompare.mockRejectedValue(new Error("bcrypt unavailable"));

    const result = await User.comparePassword("secret123", "hash");

    expect(result).toBe(false);
  });
});
