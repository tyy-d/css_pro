import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Code2,
  ImagePlus,
  Save,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { EMPTY_DESIGN, TAGS, type Design, type Viewer } from "../lib/types";
import { previewDocument, validateDesign } from "../lib/preview";
import { saveDesign, uploadImage } from "../lib/repository";
export function Submit({
  initial,
  viewer,
  onClose,
  onSaved,
  notify,
}: {
  initial?: Design;
  viewer: Viewer;
  onClose: () => void;
  onSaved: (d: Design) => void;
  notify: (s: string) => void;
}) {
  const [d, setD] = useState<Design>(
    () =>
      initial || {
        ...EMPTY_DESIGN,
        id: crypto.randomUUID(),
        owner_id: viewer.id,
        creator: viewer.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
  );
  const [step, setStep] = useState(0);
  const [agree, setAgree] = useState(!!initial?.license_accepted);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const patch = (values: Partial<Design>) => setD((v) => ({ ...v, ...values }));
  const src = useMemo(() => previewDocument(d), [d]);
  async function save(publish: boolean) {
    setErrors([]);
    if (publish) {
      const e = validateDesign(d);
      if (!agree)
        e.push("Confirm the MIT license and asset rights before publishing.");
      if (e.length) {
        setErrors(e);
        return;
      }
    }
    setBusy(true);
    try {
      const next = {
        ...d,
        title: d.title.trim() || "Untitled design",
        status: publish ? ("published" as const) : ("draft" as const),
        updated_at: new Date().toISOString(),
        license_accepted: agree,
      };
      await saveDesign(next);
      onSaved(next);
      notify(
        publish
          ? "Your design is published. Thanks for sharing."
          : "Draft saved. You can find it in My designs.",
      );
    } catch (e) {
      setErrors([e instanceof Error ? e.message : String(e)]);
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: FileList | null, kind: "screenshot" | "asset") {
    if (!files) return;
    setBusy(true);
    try {
      if (
        kind === "screenshot" &&
        d.assets.filter((a) => a.kind === "screenshot").length + files.length >
          5
      )
        throw new Error("You can add up to five screenshots.");
      const localBytes = d.assets.reduce(
        (n, a) => n + (a.url.startsWith("data:") ? a.url.length * 0.75 : 0),
        0,
      );
      if (
        [...files].reduce((n, f) => n + f.size, localBytes) >
        10 * 1024 * 1024
      )
        throw new Error("Keep all images under 10 MB per design.");
      await saveDesign({
        ...d,
        title: d.title || "Untitled design",
        status: initial?.status === "published" ? "published" : "draft",
      });
      const added = [];
      for (const f of files) added.push(await uploadImage(f, d.id, kind));
      const next = { ...d, assets: [...d.assets, ...added] };
      await saveDesign({
        ...next,
        title: next.title || "Untitled design",
        status: initial?.status === "published" ? "published" : "draft",
      });
      setD(next);
      notify("Images added.");
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="submit-page">
      <button className="text-button back" onClick={onClose}>
        <ArrowLeft size={16} /> Back to library
      </button>
      <div className="submit-heading">
        <div className="eyebrow">A LITTLE GENEROSITY GOES A LONG WAY</div>
        <h1>
          {initial ? "Make it even better." : "Good design deserves company."}
        </h1>
        <p>Share something you made. Help someone make something new.</p>
      </div>
      <div className="steps">
        {["The basics", "The design", "Style & reuse", "Review"].map((s, i) => (
          <button
            className={step === i ? "active" : step > i ? "complete" : ""}
            onClick={() => setStep(i)}
            key={s}
          >
            <span>{step > i ? <Check size={13} /> : i + 1}</span>
            {s}
          </button>
        ))}
      </div>
      <div className="submit-grid">
        <section className="form-panel">
          {step === 0 && (
            <>
              <h2>What are you sharing?</h2>
              <p className="muted">
                A piece of code or the words that brought a design to life.
              </p>
              <div className="type-choices">
                <button
                  className={d.type === "code" ? "selected" : ""}
                  onClick={() => patch({ type: "code" })}
                >
                  <Code2 />
                  <strong>Code design</strong>
                  <small>HTML + CSS, ready to reuse</small>
                </button>
                <button
                  className={d.type === "prompt" ? "selected" : ""}
                  onClick={() => patch({ type: "prompt" })}
                >
                  <Sparkles />
                  <strong>Prompt recipe</strong>
                  <small>A screenshot and how you made it</small>
                </button>
              </div>
              <label>
                Design title
                <input
                  maxLength={100}
                  value={d.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="Give your design a memorable name"
                />
              </label>
              <label>
                Description
                <textarea
                  maxLength={2000}
                  value={d.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="What makes it special? Where would it work well?"
                  rows={3}
                />
              </label>
              <label>
                Design format
                <select
                  value={d.scope}
                  onChange={(e) =>
                    patch({ scope: e.target.value as Design["scope"] })
                  }
                >
                  <option value="component">Component or section</option>
                  <option value="page">Single page</option>
                </select>
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <h2>Let the design do the talking.</h2>
              <label className="upload-zone">
                <ImagePlus size={25} />
                <strong>Add screenshots</strong>
                <span>PNG, JPEG or WebP · up to 5 images · 10 MB total</span>
                <input
                  aria-label="Upload screenshots"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  disabled={busy}
                  onChange={(e) => {
                    void upload(e.target.files, "screenshot");
                    e.target.value = "";
                  }}
                />
              </label>
              <div className="upload-thumbs">
                {d.assets
                  .filter((a) => a.kind === "screenshot")
                  .map((a) => (
                    <div key={a.id}>
                      <img src={a.url} alt={a.name} />
                      <button
                        aria-label={`Remove ${a.name}`}
                        onClick={() =>
                          patch({
                            assets: d.assets.filter((x) => x.id !== a.id),
                          })
                        }
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
              </div>
              {d.type === "code" && (
                <>
                  <label>
                    HTML{" "}
                    <small>
                      Body content only. No scripts or external embeds.
                    </small>
                    <textarea
                      className="code-input"
                      value={d.html}
                      onChange={(e) => patch({ html: e.target.value })}
                      placeholder={
                        '<section class="my-design">\n  <h1>Hello, good design.</h1>\n</section>'
                      }
                      rows={7}
                    />
                  </label>
                  <label>
                    CSS <small>Self-contained styles, up to 200 KB.</small>
                    <textarea
                      className="code-input"
                      value={d.css}
                      onChange={(e) => patch({ css: e.target.value })}
                      placeholder=".my-design { padding: 4rem; }"
                      rows={7}
                    />
                  </label>
                  <label className="file-import">
                    <Upload size={15} /> Import HTML or CSS
                    <input
                      type="file"
                      accept=".html,.css"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          if (f.size > 204800) {
                            notify("Files must be under 200 KB.");
                            return;
                          }
                          patch(
                            f.name.endsWith(".css")
                              ? { css: await f.text() }
                              : { html: await f.text() },
                          );
                        }
                      }}
                    />
                  </label>
                  <label className="file-import">
                    <ImagePlus size={15} /> Add reusable image assets
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      disabled={busy}
                      onChange={(e) => {
                        void upload(e.target.files, "asset");
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {d.assets
                    .filter((a) => a.kind === "asset")
                    .map((a) => (
                      <div className="asset-row" key={a.id}>
                        <code>assets/{a.name}</code>
                        <button
                          className="icon-btn"
                          aria-label={`Remove ${a.name}`}
                          onClick={() =>
                            patch({
                              assets: d.assets.filter((x) => x.id !== a.id),
                            })
                          }
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                </>
              )}
              <label>
                {d.type === "prompt"
                  ? "Your prompt"
                  : "Original prompt (optional)"}
                <textarea
                  value={d.prompt}
                  onChange={(e) => patch({ prompt: e.target.value })}
                  rows={6}
                  maxLength={20000}
                  placeholder="Share the actual prompt, including the details that made the difference."
                />
              </label>
              <label>
                AI tool / model (optional)
                <input
                  value={d.tool || ""}
                  onChange={(e) => patch({ tool: e.target.value })}
                  placeholder="e.g. Claude, ChatGPT, Cursor — or leave blank"
                />
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <h2>Help the right people find it.</h2>
              <label>
                Style tags <small>Choose 1–5</small>
              </label>
              <div className="tag-picker">
                {TAGS.map((t) => (
                  <button
                    className={d.tags.includes(t) ? "selected" : ""}
                    key={t}
                    onClick={() =>
                      patch({
                        tags: d.tags.includes(t)
                          ? d.tags.filter((x) => x !== t)
                          : d.tags.length < 5
                            ? [...d.tags, t]
                            : d.tags,
                      })
                    }
                  >
                    {t}
                    {d.tags.includes(t) && <Check size={12} />}
                  </button>
                ))}
              </div>
              <label>
                How to reuse it
                <textarea
                  rows={5}
                  value={d.instructions}
                  onChange={(e) => patch({ instructions: e.target.value })}
                  placeholder="What should someone preserve? How should they adapt this to their project?"
                />
              </label>
              <label>
                Attribution & asset credits
                <textarea
                  rows={3}
                  value={d.attribution}
                  onChange={(e) => patch({ attribution: e.target.value })}
                  placeholder="Credit collaborators, inspirations, and the source/license of any included assets."
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <span>
                  I have the right to share this work. I license the code and
                  prompt text under MIT, and confirm included assets can be
                  redistributed with the attribution above.
                </span>
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <h2>Ready for someone’s next idea.</h2>
              <p className="muted">
                Check the preview and details. Your design will be public
                immediately after publishing.
              </p>
              <div className="review-summary">
                <strong>{d.title || "Untitled design"}</strong>
                <p>{d.description || "Add a description in The basics."}</p>
                <div className="detail-tags">
                  {d.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>
              {d.type === "code" ? (
                <iframe
                  className="form-preview"
                  title="Submission live preview"
                  sandbox=""
                  srcDoc={src}
                />
              ) : d.assets[0] ? (
                <img
                  className="form-preview"
                  src={d.assets[0].url}
                  alt="Submission preview"
                />
              ) : (
                <div className="empty-preview">
                  Add a screenshot in The design.
                </div>
              )}
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <span>
                  I accept the MIT license and confirm redistribution rights for
                  included assets.
                </span>
              </label>
            </>
          )}
          {errors.length > 0 && (
            <div className="form-errors" role="alert">
              <strong>A few things need your attention:</strong>
              <ul>
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="form-actions">
            <button
              className="button"
              disabled={busy}
              onClick={() => save(false)}
            >
              <Save size={15} />
              Save draft
            </button>
            {step < 3 ? (
              <button
                className="button primary"
                disabled={busy}
                onClick={() => setStep(step + 1)}
              >
                Continue
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="button primary"
                disabled={busy}
                onClick={() => save(true)}
              >
                {busy ? "Saving…" : "Publish design"}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </section>
        <aside className="sharing-notes">
          <span className="small-star">✳</span>
          <h3>
            Made by you.
            <br />
            Built on by others.
          </h3>
          <p>
            The best submissions give people a useful starting point, not just a
            pretty picture.
          </p>
          <div>
            <span>01</span>
            <p>
              <strong>Show the real thing.</strong>
              <br />
              Clear screenshots help people know what they’re getting.
            </p>
          </div>
          <div>
            <span>02</span>
            <p>
              <strong>Share the details.</strong>
              <br />A small note about spacing or typography can make all the
              difference.
            </p>
          </div>
          <div>
            <span>03</span>
            <p>
              <strong>Give credit.</strong>
              <br />
              Acknowledge the work that inspired yours.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
