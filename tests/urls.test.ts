// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { appUrl, designUrl } from "../src/lib/urls";
afterEach(() => history.replaceState({}, "", "/"));
describe("GitHub Pages project paths", () => {
  it("keeps design links under the repository path and removes existing filters", () => {
    history.replaceState({}, "", "/css_pro/?tag=Minimal");
    expect(designUrl("sample-1")).toBe(
      `${location.origin}/css_pro/?design=sample-1`,
    );
    expect(appUrl()).toBe(`${location.origin}/css_pro/`);
  });
  it("continues to support root hosting", () => {
    history.replaceState({}, "", "/?view=stars");
    expect(designUrl("sample-2")).toBe(`${location.origin}/?design=sample-2`);
  });
});
