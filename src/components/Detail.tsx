import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  Check,
  Code2,
  Copy,
  Flag,
  Maximize2,
  Monitor,
  Pencil,
  Smartphone,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import type { Design, Viewer } from "../lib/types";
import { previewDocument } from "../lib/preview";
import { downloadDesign, handoff } from "../lib/download";
export function Detail({
  design: d,
  viewer,
  starred,
  onStar,
  onBack,
  onEdit,
  onReport,
  onCreator,
  notify,
}: {
  design: Design;
  viewer: Viewer | null;
  starred: boolean;
  onStar: () => void;
  onBack: () => void;
  onEdit: () => void;
  onReport: () => void;
  onCreator: () => void;
  notify: (s: string) => void;
}) {
  const [tab, setTab] = useState("preview");
  const [mobile, setMobile] = useState(false);
  const [shot, setShot] = useState(0);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const src = useMemo(() => previewDocument(d), [d]);
  const screenshots = d.assets.filter((a) => a.kind === "screenshot");
  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      notify(
        "Clipboard unavailable. Select and copy the text from the source tab.",
      );
    }
  }
  return (
    <main className="detail-page">
      <button className="text-button back" onClick={onBack}>
        <ArrowLeft size={16} /> Back to explore
      </button>
      <div className="detail-heading">
        <div>
          <div className="eyebrow">
            {d.scope === "page" ? "PAGE DESIGN" : "COMPONENT"} <span> / </span>{" "}
            {d.type === "code" ? "HTML + CSS" : "PROMPT RECIPE"}
          </div>
          <h1>{d.title}</h1>
          <button className="creator-link" onClick={onCreator}>
            <span className="tiny-avatar">{d.creator[0]}</span>
            {d.creator}
            {d.sample && <span className="sample-label">Original sample</span>}
          </button>
        </div>
        <div className="detail-actions">
          {viewer?.id === d.owner_id && (
            <button className="button" onClick={onEdit}>
              <Pencil size={16} />
              Edit
            </button>
          )}
          <button
            className={`button ${starred ? "starred" : ""}`}
            onClick={onStar}
          >
            <Star size={16} fill={starred ? "currentColor" : "none"} />
            {starred ? "Starred" : "Star"} · {d.stars}
          </button>
        </div>
      </div>
      <div className="detail-grid">
        <section className="preview-panel">
          <div className="preview-toolbar">
            <div className="tabs">
              <button
                className={tab === "preview" ? "active" : ""}
                onClick={() => setTab("preview")}
              >
                Screenshot
              </button>
              {d.type === "code" && (
                <button
                  className={tab === "live" ? "active" : ""}
                  onClick={() => setTab("live")}
                >
                  Live preview
                </button>
              )}
              <button
                className={tab === "source" ? "active" : ""}
                onClick={() => setTab("source")}
              >
                {d.type === "code" ? "Source" : "Prompt"}
              </button>
            </div>
            {tab === "live" && (
              <div className="viewport-toggle">
                <button
                  aria-label="Desktop preview"
                  aria-pressed={!mobile}
                  onClick={() => setMobile(false)}
                >
                  <Monitor size={16} />
                </button>
                <button
                  aria-label="Mobile preview"
                  aria-pressed={mobile}
                  onClick={() => setMobile(true)}
                >
                  <Smartphone size={16} />
                </button>
              </div>
            )}
          </div>
          <div
            className={`detail-preview ${tab === "source" ? "source-mode" : ""}`}
          >
            {tab === "preview" ? (
              <img src={screenshots[shot]?.url} alt={d.title} />
            ) : tab === "live" ? (
              <iframe
                title={`${d.title} isolated live preview`}
                sandbox=""
                srcDoc={src}
                style={{ width: mobile ? 375 : "100%" }}
              />
            ) : (
              <div className="source-block">
                {d.type === "code" ? (
                  <>
                    <div className="code-label">
                      index.html
                      <button onClick={() => copy(d.html, "html")}>
                        {copied === "html" ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                        Copy
                      </button>
                    </div>
                    <pre>{d.html}</pre>
                    <div className="code-label">
                      styles.css
                      <button onClick={() => copy(d.css, "css")}>
                        {copied === "css" ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                        Copy
                      </button>
                    </div>
                    <pre>{d.css}</pre>
                  </>
                ) : (
                  <>
                    <div className="code-label">
                      Creator’s prompt
                      <button onClick={() => copy(d.prompt, "prompt")}>
                        <Copy size={14} />
                        Copy
                      </button>
                    </div>
                    <pre>{d.prompt}</pre>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="preview-foot">
            <span>
              {tab === "live" ? (
                <>
                  <Maximize2 size={13} />{" "}
                  {mobile ? "375px mobile" : "Responsive desktop"} · HTML/CSS
                  only
                </>
              ) : (
                <>
                  <Monitor size={13} />{" "}
                  {d.sample
                    ? d.type === "code"
                      ? "Sample illustration · starter preview differs"
                      : "Original sample illustration"
                    : "Creator-provided visual reference"}
                </>
              )}
            </span>
            <span>MIT licensed</span>
          </div>
          {screenshots.length > 1 && (
            <div className="thumbnails">
              {screenshots.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setShot(i);
                    setTab("preview");
                  }}
                  aria-label={`Screenshot ${i + 1}`}
                >
                  <img src={s.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </section>
        <aside className="reuse-panel">
          <span className="eyebrow">MAKE IT YOUR OWN</span>
          <h2>
            A starting point.
            <br />
            Your next idea.
          </h2>
          <p>{d.description}</p>
          <button
            className="button primary full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await downloadDesign(d);
                notify("Your design package is ready.");
              } catch (e) {
                notify(e instanceof Error ? e.message : "Download failed.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <ArrowDownToLine size={17} />
            {busy
              ? "Preparing…"
              : d.type === "code"
                ? "Download design"
                : "Download recipe"}
          </button>
          <button
            className="button full"
            onClick={() => copy(handoff(d), "handoff")}
          >
            {copied === "handoff" ? <Check size={16} /> : <Copy size={16} />}{" "}
            {copied === "handoff" ? "Copied!" : "Copy AI handoff"}
          </button>
          <small>
            {d.type === "code"
              ? "HTML, CSS, assets & usage guide. No dependencies."
              : "Prompt, usage guide & creator credit. Results may vary by model."}
          </small>
          <div className="aside-divider" />
          <h3>Style notes</h3>
          <div className="detail-tags">
            {d.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <h3>What’s included</h3>
          <ul className="included">
            <li>
              {d.type === "code" ? <Code2 size={15} /> : <Sparkles size={15} />}{" "}
              {d.type === "code"
                ? "HTML & CSS source"
                : "Original design prompt"}
            </li>
            <li>
              <Copy size={15} /> AI handoff instructions
            </li>
            <li>
              <UserRound size={15} /> Creator credit & MIT license
            </li>
          </ul>
        </aside>
      </div>
      <div className="detail-notes">
        <section>
          <h2>How to use this design</h2>
          <p>{d.instructions}</p>
          {d.prompt && d.type === "code" && (
            <>
              <h3>Creator’s prompt</h3>
              <pre>{d.prompt}</pre>
              <button
                className="button"
                onClick={() => copy(d.prompt, "prompt")}
              >
                <Copy size={15} />
                Copy prompt
              </button>
            </>
          )}
        </section>
        <section>
          <h2>Credit where it’s due</h2>
          <p>{d.attribution || `Original contribution by ${d.creator}.`}</p>
          <p className="muted">
            Code and prompt text are shared under the MIT license. Keep the
            included license and creator credit when reusing them.
          </p>
          <button className="text-button" onClick={onReport}>
            <Flag size={14} /> Report this design
          </button>
        </section>
      </div>
    </main>
  );
}
