import { describe, it, expect } from "vitest";
import { readConfig } from "../src/lib/config";
describe("explicit application mode", () => {
  it("keeps demo explicit and fails closed for incomplete community configuration", () => {
    expect(readConfig({ VITE_DATA_MODE: "demo" }).error).toBe("");
    expect(readConfig({ VITE_DATA_MODE: "supabase" }).error).toContain(
      "incomplete",
    );
    expect(readConfig({ VITE_DATA_MODE: "unknown" }).error).toContain(
      "Unknown",
    );
  });
  it("rejects insecure remote endpoints and secret keys", () => {
    expect(
      readConfig({
        VITE_DATA_MODE: "supabase",
        VITE_SUPABASE_URL: "http://example.com",
        VITE_SUPABASE_PUBLISHABLE_KEY: "public",
      }).error,
    ).toContain("invalid");
    expect(
      readConfig({
        VITE_DATA_MODE: "supabase",
        VITE_SUPABASE_URL: "https://example.com",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_test",
      }).error,
    ).toContain("server-only");
  });
});
