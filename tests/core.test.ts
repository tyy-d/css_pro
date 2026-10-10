// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { SEEDS } from "../src/lib/seeds";
import { searchDesigns, type Filters } from "../src/lib/search";
import { previewDocument, validateDesign } from "../src/lib/preview";
import { createPackage } from "../src/lib/download";
import {
  getViewer,
  signIn,
  signOut,
  saveDesign,
  listDesigns,
  toggleStar,
  getStars,
  deleteDesign,
  moderate,
  reportDesign,
  listReports,
} from "../src/lib/repository";
const f: Filters = {
  q: "",
  tags: [],
  type: "all",
  scope: "all",
  sort: "newest",
  page: 1,
};
describe("discovery", () => {
  it("combines tags with OR and groups with AND", () => {
    const found = searchDesigns(SEEDS, {
      ...f,
      tags: ["Brutalist", "Glass"],
      type: "code",
      scope: "component",
    });
    expect(found.map((d) => d.id)).toEqual(["sample-3", "sample-9"]);
  });
  it("searches words across title, description, creator and tags", () => {
    expect(
      searchDesigns(SEEDS, { ...f, q: "sunday editorial" }).map((d) => d.id),
    ).toEqual(["sample-2"]);
    expect(searchDesigns(SEEDS, { ...f, q: "impossibleword" })).toHaveLength(0);
  });
  it("sorts unique star totals", () => {
    const ds = SEEDS.map((d, i) => ({ ...d, stars: i }));
    expect(searchDesigns(ds, { ...f, sort: "stars" })[0].id).toBe("sample-12");
  });
});
describe("preview and input safety", () => {
  it("preserves visual button components while preventing network requests", () => {
    const doc = previewDocument({
      ...SEEDS[0],
      html: '<button class="cta">Try it</button>',
      css: ".cta{background:green}",
    });
    const parsed = new DOMParser().parseFromString(doc, "text/html");
    expect(parsed.querySelector("button")?.textContent).toBe("Try it");
    expect(
      parsed.querySelector("meta[http-equiv]")?.getAttribute("content"),
    ).toContain("img-src data: blob:;");
  });
  it("removes executable HTML and navigation and installs a deny-by-default policy", () => {
    const doc = previewDocument({
      ...SEEDS[0],
      html: '<script>alert(1)</script><img src=x onerror="alert(2)"><a href="https://evil.test" target="_top">Go</a><form action="/steal"><input></form><iframe src="https://evil.test"></iframe>',
      css: "body{color:red} </style><script>alert(3)</script>",
    });
    const parsed = new DOMParser().parseFromString(doc, "text/html");
    expect(parsed.querySelector("script,iframe,form")).toBeNull();
    expect(parsed.querySelector("[onerror],[href],[target]")).toBeNull();
    expect(
      parsed.querySelector("meta[http-equiv]")?.getAttribute("content"),
    ).toContain("default-src 'none'");
    expect(
      parsed.querySelector("meta[http-equiv]")?.getAttribute("content"),
    ).toContain("script-src 'none'");
  });
  it("requires code only for code designs and prompts only for recipes", () => {
    expect(validateDesign(SEEDS[0])).toEqual([]);
    expect(validateDesign({ ...SEEDS[3], html: "", css: "" })).toEqual([]);
    expect(validateDesign({ ...SEEDS[3], prompt: "" })).toContain(
      "Prompt recipes need a prompt.",
    );
    expect(validateDesign({ ...SEEDS[0], html: "" })).toContain(
      "Code designs need both HTML and CSS.",
    );
  });
  it("rejects missing screenshot, tags and executable source", () => {
    const errors = validateDesign({
      ...SEEDS[0],
      assets: [],
      tags: [],
      html: "<script>alert(1)</script>",
    });
    expect(errors).toHaveLength(3);
  });
  it("sample covers are valid SVG images", () => {
    for (const d of SEEDS) {
      const svg = decodeURIComponent(
        d.assets[0].url.split(",").slice(1).join(","),
      );
      expect(
        new DOMParser()
          .parseFromString(svg, "image/svg+xml")
          .querySelector("parsererror"),
      ).toBeNull();
    }
  });
});
describe("download packages", () => {
  it("includes screenshot references in a valid downloadable archive", async () => {
    const zip = await createPackage(SEEDS[3]);
    expect(await zip.file("references/cover.svg")!.async("string")).toContain(
      "<svg",
    );
    const bytes = await zip.generateAsync({ type: "uint8array" });
    expect(bytes[0]).toBe(80);
    expect(bytes[1]).toBe(75);
  });
  it("includes complete code, license, attribution and handoff", async () => {
    const zip = await createPackage(SEEDS[0]);
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining([
        "index.html",
        "styles.css",
        "README.md",
        "AI-HANDOFF.md",
        "LICENSE",
      ]),
    );
    expect(await zip.file("README.md")!.async("string")).toContain(
      "CSS Pro Studio",
    );
    expect(await zip.file("LICENSE")!.async("string")).toContain(
      "Permission is hereby granted",
    );
    expect(await zip.file("index.html")!.async("string")).toContain(
      "styles.css",
    );
  });
  it("does not fabricate code for prompt recipes", async () => {
    const zip = await createPackage(SEEDS[3]);
    expect(zip.file("index.html")).toBeNull();
    expect(await zip.file("PROMPT.md")!.async("string")).toBe(SEEDS[3].prompt);
  });
});
describe("local demonstration workflow", () => {
  beforeEach(() => localStorage.clear());
  it("preserves drafts, stars, publication and moderation across reads", async () => {
    expect(await getViewer()).toBeNull();
    await signIn("github");
    const v = await getViewer();
    const d = {
      ...SEEDS[0],
      id: "local-test",
      owner_id: v!.id,
      creator: v!.name,
      sample: false,
      status: "draft" as const,
    };
    await saveDesign(d);
    expect((await listDesigns()).find((x) => x.id === d.id)?.status).toBe(
      "draft",
    );
    await saveDesign({ ...d, status: "published" });
    await toggleStar(d.id, true);
    await toggleStar(d.id, true);
    expect((await getStars()).filter((x) => x === d.id)).toHaveLength(1);
    expect((await listDesigns()).find((x) => x.id === d.id)?.stars).toBe(1);
    await reportDesign(d.id, "Attribution needs attention");
    expect(await listReports()).toHaveLength(1);
    await moderate(d.id, "hide");
    await expect(saveDesign({ ...d, status: "published" })).rejects.toThrow(
      "moderator",
    );
    await moderate(d.id, "restore");
    await deleteDesign(d.id);
    expect((await listDesigns()).some((x) => x.id === d.id)).toBe(false);
    await signOut();
    expect(await getViewer()).toBeNull();
  });
  it("rejects edits to another creator", async () => {
    await signIn("github");
    await expect(saveDesign(SEEDS[0])).rejects.toThrow("own designs");
  });
});
