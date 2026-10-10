import type { Design } from "./types";
const svg = (body: string, bg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560"><rect width="800" height="560" fill="${bg}"/>${body}</svg>`)}`;
const text = (
  x: number,
  y: number,
  s: number,
  t: string,
  color = "#252820",
  extra = "",
) =>
  `<text x="${x}" y="${y}" font-size="${s}" fill="${color}" ${extra.includes("font-family=") ? "" : 'font-family="Arial, sans-serif"'} ${extra}>${t}</text>`;
const arts = [
  svg(
    `<rect x="75" y="62" width="650" height="436" rx="4" fill="#faf9f4"/>${text(110, 104, 14, "FORMA", "#273c2e", 'font-weight="700" letter-spacing="3"')}${text(527, 104, 10, "Our work     About     Contact")}<path d="M110 123H690" stroke="#dddcd1"/>${text(110, 190, 11, "SPACES FOR A SLOWER LIFE", "#687164", 'letter-spacing="2"')}${text(107, 252, 58, "Room to", "#273c2e", 'font-family="Georgia,serif"')}${text(107, 317, 58, "just be.", "#273c2e", 'font-family="Georgia,serif"')}<rect x="110" y="353" width="126" height="32" rx="16" fill="#273c2e"/>${text(130, 374, 11, "Explore our spaces", "#fff")}<rect x="407" y="158" width="280" height="283" rx="140" fill="#e3ddca"/><path d="M467 441V272q0-89 83-89t83 89v169" fill="#c3c6b0"/><path d="M505 441V280q0-48 45-48t45 48v161" fill="#818f75"/><ellipse cx="553" cy="407" rx="85" ry="14" fill="#b7bca4"/><path d="M489 393h110v26H489z" fill="#ded8c0"/>${text(110, 464, 10, "Considered architecture. Everyday living.", "#7c8275")}`,
    "#dce3d8",
  ),
  svg(
    `<rect x="160" y="63" width="480" height="434" rx="22" fill="#f9f7f0"/>${text(195, 109, 12, "WEEKLY NOTE", "#756f62", 'letter-spacing="2"')}<circle cx="584" cy="104" r="15" fill="#ece9df"/>${text(578, 109, 15, "↗")}<path d="M195 128H605" stroke="#dedbcf"/>${text(194, 203, 49, "A little less noise.", "#3d4035", 'font-family="Georgia,serif"')}${text(195, 245, 18, "A little more perspective.", "#858477")}<path d="M440 304c-42-73 32-99 48-49 33-49 95-4 41 43-26 22-45 36-45 36z" fill="#c8ce7b"/>${text(195, 317, 13, "Thoughtful reads, delivered slowly.", "#7b7c6c")}${text(195, 340, 13, "One letter. Every Sunday.", "#7b7c6c")}<rect x="195" y="378" width="300" height="49" rx="6" fill="#eeede4"/>${text(211, 408, 13, "Your email address", "#99998c")}<rect x="501" y="378" width="104" height="49" rx="6" fill="#373d31"/>${text(526, 408, 13, "Join us", "#fff")}${text(195, 461, 10, "A small corner of the internet. Just for you.", "#9a9a8e")}`,
    "#e9e6d9",
  ),
  svg(
    `<defs><radialGradient id="g"><stop stop-color="#9680e9"/><stop offset="1" stop-color="#24243b"/></radialGradient></defs><circle cx="406" cy="275" r="229" fill="url(#g)"/><rect x="144" y="105" width="512" height="350" rx="22" fill="#ffffff" fill-opacity=".10" stroke="#ffffff" stroke-opacity=".25"/>${text(181, 151, 11, "ACOUSTIC / 001", "#cac9e9", 'letter-spacing="3"')}<circle cx="596" cy="146" r="16" fill="#ffffff" fill-opacity=".1"/>${text(590, 151, 14, "+", "#fff")}<circle cx="256" cy="269" r="74" fill="#29283e"/><circle cx="256" cy="269" r="53" fill="none" stroke="#46415a" stroke-width="2"/><circle cx="256" cy="269" r="34" fill="#ada3d1"/><circle cx="256" cy="269" r="8" fill="#282739"/>${text(360, 250, 27, "After hours", "#fff", 'font-weight="500"')}${text(360, 281, 14, "Sounds for slowing down", "#bcb9d4")}<path d="M181 370H618" stroke="#ffffff" stroke-opacity=".2"/><path d="M181 370H405" stroke="#d2c5f8" stroke-width="3"/>${text(181, 399, 11, "02:34", "#c7c1dc")}${text(590, 399, 11, "04:18", "#c7c1dc")}<path d="m396 398 13 8-13 8z" fill="#fff"/>`,
    "#202032",
  ),
  svg(
    `${text(58, 64, 15, "OFFGRID®", "#242424", 'font-weight="700"')}${text(542, 64, 11, "INDEX     JOURNAL     INFO")}<path d="M58 84H742" stroke="#242424"/>${text(53, 218, 117, "MAKE IT", "#252525", 'font-weight="900" letter-spacing="-8"')}${text(53, 330, 117, "WEIRD.", "#252525", 'font-weight="900" letter-spacing="-8"')}<rect x="527" y="128" width="166" height="166" fill="#ec5937" transform="rotate(12 610 211)"/><path d="M610 157v108m-54-54h108m-92-38 76 76m-76 0 76-76" stroke="#f8edcf" stroke-width="20"/>${text(59, 397, 14, "An independent space for unconventional ideas.")}${text(59, 421, 14, "Good things happen outside the lines.")}<rect x="59" y="461" width="165" height="40" fill="#252525"/>${text(78, 486, 12, "EXPLORE THE INDEX ↗", "#f8edcf")}${text(628, 489, 11, "EST. 2026")}`,
    "#efe9d8",
  ),
  svg(
    `<rect x="87" y="72" width="626" height="416" rx="10" fill="#fbfbfc"/>${text(118, 113, 14, "overview", "#252a35", 'font-weight="700"')}${text(572, 113, 10, "Last 30 days ⌄", "#7f8491")}<path d="M118 137H682" stroke="#ededef"/>${text(119, 176, 11, "TOTAL REVENUE", "#8b8e9a", 'letter-spacing="1"')}${text(117, 221, 40, "$24,680", "#242934", 'font-weight="500"')}<rect x="311" y="198" width="72" height="23" rx="11" fill="#e5f1e8"/>${text(323, 214, 10, "↗ 12.8%", "#487457")}${text(119, 248, 11, "A good month, by the numbers.", "#9699a1")}<path d="M123 398H674M123 353H674M123 308H674" stroke="#eeeff2"/><path d="m123 389 50-30 50 11 50-44 50 13 50-28 50 9 50-50 50 16 50-42 50 7V408H123Z" fill="#eef0fb"/><path d="m123 389 50-30 50 11 50-44 50 13 50-28 50 9 50-50 50 16 50-42 50 7" fill="none" stroke="#858cc5" stroke-width="3"/>${text(118, 446, 10, "01 JUN", "#9a9da6")}${text(608, 446, 10, "30 JUN", "#9a9da6")}`,
    "#e7e9ee",
  ),
  svg(
    `<circle cx="650" cy="57" r="189" fill="#d7e69b"/><circle cx="114" cy="519" r="193" fill="#c8da88"/><rect x="143" y="95" width="514" height="370" rx="26" fill="#fbf8e9"/>${text(181, 143, 16, "little wins ✳", "#415b32", 'font-weight="700"')}${text(181, 205, 34, "Big plans.", "#415b32", 'font-weight="700"')}${text(181, 248, 34, "Small steps.", "#415b32", 'font-weight="700"')}${text(181, 283, 13, "Make room for a little progress, every day.", "#7e8968")}<rect x="181" y="319" width="438" height="53" rx="12" fill="#efefdc"/><circle cx="206" cy="345" r="10" fill="#728c43"/>${text(200, 350, 14, "✓", "#fff")}${text(228, 350, 13, "Go outside. Touch some grass.", "#5b6747")}<rect x="181" y="388" width="139" height="38" rx="19" fill="#435d32"/>${text(203, 412, 12, "Find your rhythm", "#fff")}<path d="m557 156 8 23 25-2-19 16 9 24-23-14-21 14 6-24-19-16 25 2z" fill="#e6b84e"/>`,
    "#dfe9b9",
  ),
];
const configs = [
  [
    "Forma — room to just be",
    "A considered architecture landing page. Warm neutrals, generous space, and an organic sense of place.",
    "page",
    "code",
    ["Minimal", "Organic"],
    "Forma",
  ],
  [
    "The Sunday letter",
    "An understated newsletter card with a warm, editorial feel. A quieter way to ask for an email.",
    "component",
    "code",
    ["Editorial", "Minimal"],
    "Sunday",
  ],
  [
    "After hours player",
    "A translucent music card for late-night listening. Soft violet light and layered glass surfaces.",
    "component",
    "code",
    ["Glass", "Dark"],
    "After hours",
  ],
  [
    "Offgrid studio",
    "An unapologetically bold studio page. Oversized typography, paper tones, and a little creative friction.",
    "page",
    "prompt",
    ["Brutalist", "Typography"],
    "Offgrid",
  ],
  [
    "Numbers, quietly",
    "A clean analytics card that puts the numbers first. Calm colors and just enough visual hierarchy.",
    "component",
    "code",
    ["Minimal", "Monochrome"],
    "Overview",
  ],
  [
    "Little wins",
    "A friendly habit tracker with rounded shapes, leafy greens, and an optimistic outlook.",
    "component",
    "prompt",
    ["Playful", "Organic"],
    "Little wins",
  ],
  [
    "Objects of everyday",
    "A warm product showcase with architectural proportions and space for the details.",
    "page",
    "code",
    ["Editorial", "Organic"],
    "Objects",
  ],
  [
    "Letters from elsewhere",
    "A gentle sign-up for a travel journal. Simple, tactile, and a little nostalgic.",
    "component",
    "prompt",
    ["Retro", "Editorial"],
    "Elsewhere",
  ],
  [
    "Midnight collection",
    "A dark collection card with luminous depth and a carefully restrained palette.",
    "component",
    "code",
    ["Dark", "Glass"],
    "Midnight",
  ],
  [
    "Type is the message",
    "A typography-first portfolio for people who have something to say.",
    "page",
    "code",
    ["Typography", "Brutalist"],
    "Type studio",
  ],
  [
    "A clearer overview",
    "An approachable data summary for a personal dashboard.",
    "component",
    "prompt",
    ["Monochrome", "Minimal"],
    "Clarity",
  ],
  [
    "Grow at your pace",
    "An organic landing section for a slower, more intentional kind of progress.",
    "page",
    "code",
    ["Organic", "Playful"],
    "Grow",
  ],
] as const;
export const SEEDS: Design[] = configs.map((c, i) => {
  const [title, description, scope, type, tags, label] = c;
  const variant = i % 6;
  const colors = [
    ["#dce3d8", "#faf9f4", "#273c2e"],
    ["#e9e6d9", "#f9f7f0", "#3d4035"],
    ["#202032", "#37334f", "#efecff"],
    ["#efe9d8", "#efe9d8", "#252525"],
    ["#e7e9ee", "#fbfbfc", "#242934"],
    ["#dfe9b9", "#fbf8e9", "#415b32"],
  ][variant];
  return {
    id: `sample-${i + 1}`,
    owner_id: "sample-studio",
    creator: "CSS Pro Studio",
    title,
    description,
    type,
    scope,
    tags: [...tags],
    html: `<main class="canvas"><article class="card"><header><span>${label.toUpperCase()}</span><span>↗</span></header><div class="eyebrow">THOUGHTFULLY MADE / 001</div><h1>${["Room to<br>just be.", "A little less noise.", "After hours.", "MAKE IT<br>WEIRD.", "$24,680", "Big plans.<br>Small steps."][variant]}</h1><p>${description}</p><a class="cta">${variant === 4 ? "↗ 12.8% this month" : "Make it your own ↗"}</a><div class="decoration"></div><footer>Good design, shared. &nbsp; — &nbsp; ${label}</footer></article></main>`,
    css: `body{font-family:${variant === 0 || variant === 1 ? "Georgia,serif" : "Arial,sans-serif"};color:${colors[2]};background:${colors[0]}}.canvas{min-height:100vh;display:grid;place-items:center;padding:40px}.card{position:relative;overflow:hidden;width:100%;max-width:660px;padding:36px;background:${colors[1]};border-radius:${variant === 3 ? "0" : "18px"}}header{display:flex;justify-content:space-between;font:700 12px Arial;letter-spacing:2px;border-bottom:1px solid currentColor;padding-bottom:20px}.eyebrow{font:10px Arial;letter-spacing:2px;margin-top:38px;opacity:.6}h1{font-size:clamp(36px,7vw,72px);letter-spacing:-3px;line-height:1.02;margin:22px 0;font-weight:${variant === 3 ? "900" : "500"}}p{font:14px/1.7 Arial;max-width:350px;opacity:.7}.cta{display:inline-block;margin-top:20px;padding:13px 20px;background:${colors[2]};color:${colors[1]};border-radius:24px;font:12px Arial}.decoration{position:absolute;width:140px;height:140px;right:-30px;bottom:30px;background:currentColor;opacity:.08;border-radius:50%}footer{margin-top:52px;font:10px Arial;opacity:.5}@media(max-width:480px){.canvas{padding:16px}.card{padding:24px}h1{letter-spacing:-1px}}`,
    prompt:
      type === "prompt"
        ? `Create a ${tags.join(", ").toLowerCase()} ${scope === "page" ? "single-page website" : "UI component"} called "${label}". ${description} Use a ${colors[0]} background, ${colors[1]} surfaces, and ${colors[2]} typography. Match the attached visual reference, prioritizing whitespace, type scale, and proportions. Build responsive HTML/CSS without JavaScript or external dependencies. Keep the content accessible and avoid adding unrelated sections.`
        : "",
    instructions:
      type === "prompt"
        ? "Use the screenshot in references/ and the prompt in PROMPT.md together. Ask your AI builder to preserve typography, palette, spacing, and proportions while adapting the content. Model outputs vary, so compare the result with the reference and iterate."
        : "Use the screenshot as a visual reference. The included HTML/CSS is a simplified, dependency-free starting point; adapt content and proportions to your project. Keep the color palette and spacing consistent. At narrow widths, stack content and keep generous padding.",
    attribution:
      "Original sample illustration and starter code by CSS Pro Studio. Illustrations are visual references; live previews show the simplified starter implementation.",
    assets: [
      {
        id: `cover-${i}`,
        name: "cover.svg",
        url: arts[variant],
        kind: "screenshot",
      },
    ],
    status: "published",
    created_at: new Date(Date.UTC(2026, 9, 8 - i)).toISOString(),
    updated_at: new Date(Date.UTC(2026, 9, 8 - i)).toISOString(),
    stars: 0,
    sample: true,
    license_accepted: true,
  };
});
