// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { consumeAuthError, oauthRedirect, routeAccess } from "../src/lib/auth";
const member = { id: "member", name: "Member", admin: false };
describe("protected routes", () => {
  it.each(["submit", "mine", "stars", "admin"])(
    "gates direct %s links while restoring sessions and after sign-out",
    (route) => {
      expect(routeAccess(route, null, true)).toBe("loading");
      expect(routeAccess(route, null, false)).toBe("login");
    },
  );
  it("restricts moderation to administrators and leaves browsing public", () => {
    expect(routeAccess("admin", member, false)).toBe("denied");
    expect(routeAccess("admin", { ...member, admin: true }, false)).toBe(
      "allowed",
    );
    expect(routeAccess("mine", member, false)).toBe("allowed");
    expect(routeAccess("explore", null, true)).toBe("public");
  });
  it("retains the app subpath and intended route, removing callback credentials", () => {
    expect(
      oauthRedirect(
        "https://example.com/css_pro/?view=submit&code=secret#access_token=secret",
      ),
    ).toBe("https://example.com/css_pro/");
  });
  it("handles denied OAuth without exposing provider details and consumes the error once", () => {
    history.replaceState(
      {},
      "",
      "/?view=mine&error=access_denied&error_description=private",
    );
    expect(consumeAuthError()).toContain("try again");
    expect(location.search).toBe("?view=mine");
    expect(consumeAuthError()).toBeNull();
  });
});
