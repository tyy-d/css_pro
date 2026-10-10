import DOMPurify from "dompurify";
import type { Design } from "./types";
export function safeCss(input: string): string {
  // CSS is never inserted into the application document. The iframe CSP blocks all remote fetches.
  return input
    .replace(/<\/style/gi, "<\\/style")
    .replace(/@import\s[^;]+;?/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "");
}
export function previewDocument(
  design: Pick<Design, "html" | "css" | "assets">,
): string {
  let source = design.html;
  let css = design.css;
  for (const asset of design.assets.filter((a) => a.kind === "asset")) {
    if (
      /^(data:image\/(png|jpeg|webp);base64,|blob:|https:\/\/)/.test(asset.url)
    ) {
      source = source.split(`assets/${asset.name}`).join(asset.url);
      css = css.split(`assets/${asset.name}`).join(asset.url);
    }
  }
  const html = DOMPurify.sanitize(source, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [
      "script",
      "style",
      "iframe",
      "object",
      "embed",
      "form",
      "link",
      "meta",
      "base",
      "video",
      "audio",
      "source",
    ],
    ADD_DATA_URI_TAGS: ["img"],
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|blob):|data:image\/(?:png|jpeg|webp);base64,|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    FORBID_ATTR: [
      "srcset",
      "action",
      "formaction",
      "target",
      "ping",
      "download",
      "href",
    ],
  });
  // Approved images are loaded by the parent and embedded as data/blob URLs.
  // No network destinations are allowed inside untrusted content.
  const csp =
    "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none';";
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;min-height:100%;}*{box-sizing:border-box}img{max-width:100%}${safeCss(css)}</style></head><body>${html}</body></html>`;
}
export function validateDesign(d: Design): string[] {
  const errors: string[] = [];
  if (!d.title.trim() || d.title.length > 100)
    errors.push("Add a title of 1–100 characters.");
  if (!d.description.trim() || d.description.length > 2000)
    errors.push("Add a description of up to 2,000 characters.");
  if (d.tags.length < 1 || d.tags.length > 5)
    errors.push("Choose between one and five style tags.");
  if (!d.assets.some((a) => a.kind === "screenshot"))
    errors.push("Add at least one screenshot.");
  if (d.assets.filter((a) => a.kind === "screenshot").length > 5)
    errors.push("Use no more than five screenshots.");
  if (!d.instructions.trim())
    errors.push("Add instructions to help someone reuse your design.");
  if (d.type === "code" && (!d.html.trim() || !d.css.trim()))
    errors.push("Code designs need both HTML and CSS.");
  if (d.type === "prompt" && !d.prompt.trim())
    errors.push("Prompt recipes need a prompt.");
  if (d.prompt.length > 20000)
    errors.push("Keep the prompt under 20,000 characters.");
  if (new Blob([d.html]).size > 204800 || new Blob([d.css]).size > 204800)
    errors.push("HTML and CSS must each be under 200 KB.");
  if (
    d.type === "code" &&
    /<script\b|\bon\w+\s*=|<iframe\b|<form\b|<link\b/i.test(d.html)
  )
    errors.push(
      "Remove scripts, event handlers, embeds, forms, and external stylesheets.",
    );
  if (d.type === "code" && /@import|url\(\s*["']?(?:https?:|\/\/)/i.test(d.css))
    errors.push("Use uploaded images instead of external CSS resources.");
  return errors;
}
