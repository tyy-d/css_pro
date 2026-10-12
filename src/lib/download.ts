import { designUrl } from "./urls";
import type { Design } from "./types";
export const license = (name: string) =>
  `MIT License\n\nCopyright (c) ${new Date().getFullYear()} ${name}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;
export function handoff(d: Design) {
  return `Use "${d.title}" by ${d.creator} as the visual reference for my website.\n\nPreserve its typography hierarchy, spacing rhythm, color palette, layout proportions, and responsive behavior while adapting the content to my project. Do not introduce unrelated visual styles.\n\n${d.instructions}\n\n${d.type === "code" ? "Inspect index.html, styles.css, references/, and any included assets before implementing. Adapt them to the current project framework." : "Use the images in references/ and PROMPT.md as the design reference. Results may vary by model."}\n\nKeep the creator credit and MIT license with reused code.\nSource: ${designUrl(d.id)}`;
}
export async function createPackage(d: Design) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  if (d.type === "code") {
    zip.file(
      "index.html",
      `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="styles.css"><title>${d.title.replace(/[<>&"]/g, "")}</title></head><body>\n${d.html}\n</body></html>`,
    );
    zip.file("styles.css", d.css);
  }
  if (d.prompt) zip.file("PROMPT.md", d.prompt);
  zip.file(
    "README.md",
    `# ${d.title}\n\nBy ${d.creator}\n\n${d.description}\n\n## Usage\n${d.instructions}\n\n## Attribution\n${d.attribution || "Original contribution."}\n\nSource: ${designUrl(d.id)}\n\nCode and prompt text: MIT. See LICENSE. Asset attribution is provided above.\n`,
  );
  zip.file("AI-HANDOFF.md", handoff(d));
  zip.file("LICENSE", license(d.creator));
  for (const asset of d.assets) {
    const response = await fetch(asset.url);
    if (!response.ok)
      throw new Error(`Could not download ${asset.name}. Please retry.`);
    zip.file(
      ` ${asset.kind === "asset" ? "assets" : "references"}/${asset.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`.trim(),
      await response.arrayBuffer(),
    );
  }
  return zip;
}
export async function downloadDesign(d: Design) {
  const zip = await createPackage(d);
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
