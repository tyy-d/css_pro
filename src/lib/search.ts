import type { Design } from "./types";
export interface Filters {
  q: string;
  tags: string[];
  type: string;
  scope: string;
  sort: string;
  page: number;
}
export function readFilters(): Filters {
  const p = new URLSearchParams(location.search);
  return {
    q: p.get("q") || "",
    tags: p.getAll("tag"),
    type: p.get("type") || "all",
    scope: p.get("scope") || "all",
    sort: p.get("sort") || "newest",
    page: Math.max(1, Number(p.get("page")) || 1),
  };
}
export function searchDesigns(designs: Design[], f: Filters) {
  const words = f.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const score = (d: Design) =>
    words.reduce(
      (n, w) =>
        n +
        (d.title.toLowerCase().includes(w) ? 3 : 0) +
        (d.tags.join(" ").toLowerCase().includes(w) ? 2 : 0) +
        (d.description.toLowerCase().includes(w) ? 1 : 0),
      0,
    );
  return designs
    .filter(
      (d) =>
        (f.type === "all" || d.type === f.type) &&
        (f.scope === "all" || d.scope === f.scope) &&
        (!f.tags.length || f.tags.some((t) => d.tags.includes(t))) &&
        words.every((w) =>
          `${d.title} ${d.description} ${d.creator} ${d.tags.join(" ")}`
            .toLowerCase()
            .includes(w),
        ),
    )
    .sort((a, b) =>
      f.sort === "stars"
        ? b.stars - a.stars || b.created_at.localeCompare(a.created_at)
        : f.sort === "relevance" && words.length
          ? score(b) - score(a) || b.created_at.localeCompare(a.created_at)
          : b.created_at.localeCompare(a.created_at),
    );
}
