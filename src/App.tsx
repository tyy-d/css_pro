import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Code2,
  Github,
  LayoutGrid,
  LogOut,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import type { Design, Report, Viewer } from "./lib/types";
import { TAGS } from "./lib/types";
import * as repo from "./lib/repository";
import { readFilters, searchDesigns, type Filters } from "./lib/search";
import { DesignCard } from "./components/DesignCard";
import { Detail } from "./components/Detail";
import { Submit } from "./components/Submit";
import { Modal } from "./components/Modal";
export default function App() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [stars, setStars] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(readFilters);
  const [route, setRoute] = useState(
    () => new URLSearchParams(location.search).get("view") || "explore",
  );
  const [detailId, setDetailId] = useState(() =>
    new URLSearchParams(location.search).get("design"),
  );
  const [creator, setCreator] = useState(() =>
    new URLSearchParams(location.search).get("creator"),
  );
  const [editing, setEditing] = useState<Design | undefined>();
  const [modal, setModal] = useState<
    "login" | "about" | "report" | "delete" | null
  >(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Design | null>(null);
  const notify = useCallback((s: string) => setToast(s), []);
  const refresh = useCallback(async () => {
    try {
      const [v, ds, ss] = await Promise.all([
        repo.getViewer(),
        repo.listDesigns(),
        repo.getStars(),
      ]);
      setViewer(v);
      setDesigns(ds);
      setStars(ss);
      setError("");
      if (v?.admin) setReports(await repo.listReports());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not load designs. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const sub = repo.supabase?.auth.onAuthStateChange(() => {
      setTimeout(() => void refresh(), 0);
    });
    return () => sub?.data.subscription.unsubscribe();
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const pop = () => {
      const p = new URLSearchParams(location.search);
      setFilters(readFilters());
      setRoute(p.get("view") || "explore");
      setDetailId(p.get("design"));
      setCreator(p.get("creator"));
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  function navigate(view = "explore", id?: string, creatorId?: string) {
    const p = new URLSearchParams();
    if (view !== "explore") p.set("view", view);
    if (id) p.set("design", id);
    if (creatorId) p.set("creator", creatorId);
    history.pushState({}, "", p.size ? `?${p}` : location.pathname);
    setRoute(view);
    setDetailId(id || null);
    setCreator(creatorId || null);
    setFilters({
      q: "",
      tags: [],
      type: "all",
      scope: "all",
      sort: "newest",
      page: 1,
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function changeFilters(patch: Partial<Filters>) {
    const f = { ...filters, ...patch, page: patch.page ?? 1 };
    setFilters(f);
    const p = new URLSearchParams(location.search);
    ["q", "tag", "type", "scope", "sort", "page"].forEach((k) => p.delete(k));
    if (f.q) p.set("q", f.q);
    f.tags.forEach((t) => p.append("tag", t));
    if (f.type !== "all") p.set("type", f.type);
    if (f.scope !== "all") p.set("scope", f.scope);
    if (f.sort !== "newest") p.set("sort", f.sort);
    if (f.page > 1) p.set("page", String(f.page));
    history.replaceState({}, "", p.size ? `?${p}` : location.pathname);
  }
  function share() {
    if (!viewer) {
      setModal("login");
      return;
    }
    setEditing(undefined);
    navigate("submit");
  }
  async function star(id: string) {
    if (!viewer) {
      setModal("login");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await repo.toggleStar(id, !stars.includes(id));
      await refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function auth(provider: "google" | "github") {
    setBusy(true);
    try {
      await repo.signIn(provider);
      await refresh();
      setModal(null);
      if (repo.demo)
        notify("Demo session started. Changes stay in this browser.");
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  const detail = designs.find(
    (d) =>
      d.id === detailId &&
      (d.status === "published" || d.owner_id === viewer?.id || viewer?.admin),
  );
  const base = designs.filter((d) =>
    route === "mine"
      ? d.owner_id === viewer?.id
      : route === "stars"
        ? d.status === "published" && stars.includes(d.id)
        : d.status === "published" && (!creator || d.owner_id === creator),
  );
  const filtered = searchDesigns(base, filters);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 9));
  const page = Math.min(filters.page, pageCount);
  const visible = filtered.slice((page - 1) * 9, page * 9);
  return (
    <>
      <header className="site-header">
        <a
          href={location.pathname}
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate();
          }}
          aria-label="CSS Pro home"
        >
          <span className="brand-icon">
            <Code2 size={22} strokeWidth={2} />
          </span>
          <span>
            css<span className="brand-pro">pro</span>
            <span className="brand-dot">.</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <button
            className={route === "explore" && !detailId ? "active" : ""}
            onClick={() => navigate()}
          >
            Explore
          </button>
          <button
            className={route === "stars" ? "active" : ""}
            onClick={() => (viewer ? navigate("stars") : setModal("login"))}
          >
            My stars
          </button>
          <button onClick={() => setModal("about")}>
            The idea <ArrowUpRight size={12} />
          </button>
        </nav>
        <div className="header-actions">
          {viewer ? (
            <>
              <button
                className="account-button"
                title="My designs"
                onClick={() => navigate("mine")}
              >
                <span className="avatar">{viewer.name[0]}</span>
                <span className="account-name">My designs</span>
              </button>
              <button
                className="icon-btn logout"
                aria-label="Sign out"
                onClick={async () => {
                  await repo.signOut();
                  await refresh();
                  navigate();
                }}
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <button className="sign-in" onClick={() => setModal("login")}>
              Sign in
            </button>
          )}
          <button className="button primary share-button" onClick={share}>
            <Plus size={16} />
            <span>Share a design</span>
          </button>
        </div>
      </header>
      {repo.demo && (
        <div className="demo-bar">
          <span>
            <span className="live-dot" />
            Community preview <span className="demo-separator">/</span> Original
            samples. Your changes stay in this browser.
          </span>
          <button onClick={() => setModal("about")}>
            How it works <ArrowUpRight size={12} />
          </button>
        </div>
      )}
      {route === "submit" && viewer ? (
        <Submit
          key={editing?.id || "new"}
          initial={editing}
          viewer={viewer}
          onClose={() => navigate("mine")}
          onSaved={async (d) => {
            await refresh();
            navigate(
              d.status === "published" ? "explore" : "mine",
              d.status === "published" ? d.id : undefined,
            );
          }}
          notify={notify}
        />
      ) : detailId ? (
        <>
          {detail ? (
            <Detail
              design={detail}
              viewer={viewer}
              starred={stars.includes(detail.id)}
              onStar={() => void star(detail.id)}
              onBack={() => navigate()}
              onEdit={() => {
                setEditing(detail);
                navigate("submit");
              }}
              onReport={() => (viewer ? setModal("report") : setModal("login"))}
              onCreator={() => navigate("explore", undefined, detail.owner_id)}
              notify={notify}
            />
          ) : (
            <main className="empty-state">
              <h1>{loading ? "Loading design…" : "Design unavailable"}</h1>
              <p>This design may be private, unpublished, or removed.</p>
              <button className="button" onClick={() => navigate()}>
                Back to explore
              </button>
            </main>
          )}
        </>
      ) : route === "admin" && viewer?.admin ? (
        <main className="admin-page">
          <div className="eyebrow">COMMUNITY CARE</div>
          <h1>Moderation queue</h1>
          <p>Review reports and manage hidden designs.</p>
          {repo.demo && (
            <p className="notice">
              Demo moderation applies only to your locally created designs.
            </p>
          )}
          {reports.filter((r) => !r.resolved).length === 0 && (
            <p className="empty-state">No open reports. All quiet here.</p>
          )}
          {reports
            .filter((r) => !r.resolved)
            .map((r) => (
              <div className="admin-row" key={r.id}>
                <div>
                  <strong>
                    {designs.find((d) => d.id === r.design_id)?.title ||
                      r.design_id}
                  </strong>
                  <p>{r.reason}</p>
                </div>
                <button
                  className="button"
                  onClick={() => navigate("explore", r.design_id)}
                >
                  View
                </button>
                <button
                  className="button"
                  onClick={async () => {
                    try {
                      await repo.moderate(r.design_id, "hide");
                      await refresh();
                      notify("Design hidden and report resolved.");
                    } catch (e) {
                      notify(String(e));
                    }
                  }}
                >
                  Hide design
                </button>
              </div>
            ))}
          {designs
            .filter((d) => d.status === "hidden")
            .map((d) => (
              <div className="admin-row" key={d.id}>
                <strong>{d.title}</strong>
                <span>Hidden</span>
                <button
                  className="button"
                  onClick={async () => {
                    await repo.moderate(d.id, "restore");
                    await refresh();
                    notify("Design restored.");
                  }}
                >
                  Restore
                </button>
              </div>
            ))}
        </main>
      ) : (
        <main className="explore-page">
          <section className="gallery-intro">
            <div>
              <div className="eyebrow">
                <span className="mini-spark">✳</span>
                {route === "stars"
                  ? "YOUR PERSONAL INSPIRATION FOLDER"
                  : route === "mine"
                    ? "A LITTLE CORNER OF YOUR OWN"
                    : creator
                      ? "MEET THE MAKER"
                      : "A LIBRARY FOR YOUR NEXT GOOD IDEA"}
              </div>
              <h1>
                {route === "stars" ? (
                  <>
                    Worth coming <em>back to.</em>
                  </>
                ) : route === "mine" ? (
                  <>
                    Made by <em>you.</em>
                  </>
                ) : creator ? (
                  <>
                    {base[0]?.creator || "Creator"}
                    <em>’s collection.</em>
                  </>
                ) : (
                  <>
                    Good design, <em>shared.</em>
                  </>
                )}
              </h1>
              <p>
                {route === "stars"
                  ? "Your favorite designs, all in one place. Ready when inspiration strikes."
                  : route === "mine"
                    ? "Your published designs and works in progress."
                    : creator
                      ? "Thoughtful work, shared with the community."
                      : "Discover thoughtful web designs. Take the code, borrow the prompt, make it your own."}
              </p>
            </div>
            <div className="intro-note">
              <div className="note-symbol">↗</div>
              <p>
                Less starting from scratch.
                <br />
                <strong>More making it yours.</strong>
              </p>
            </div>
          </section>
          <section className="discovery" aria-label="Search designs">
            <div className="search-row">
              <div className="search-box">
                <Search size={19} />
                <input
                  aria-label="Search designs"
                  placeholder="Try ‘minimal’, ‘landing page’, or a feeling…"
                  value={filters.q}
                  onChange={(e) =>
                    changeFilters({
                      q: e.target.value,
                      sort: e.target.value ? "relevance" : "newest",
                    })
                  }
                />
                {filters.q ? (
                  <button
                    className="icon-btn"
                    aria-label="Clear search"
                    onClick={() => changeFilters({ q: "" })}
                  >
                    <X size={15} />
                  </button>
                ) : (
                  <span className="search-hint">Find your style</span>
                )}
              </div>
              <button
                className={`button filter-button ${showFilters ? "selected" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
              >
                <SlidersHorizontal size={16} />
                Filters
                {(filters.type !== "all" || filters.scope !== "all") && (
                  <span className="filter-dot" />
                )}
              </button>
            </div>
            <div className="tag-row">
              <button
                className={!filters.tags.length ? "active" : ""}
                onClick={() => changeFilters({ tags: [] })}
              >
                All styles
              </button>
              {TAGS.map((t) => (
                <button
                  className={filters.tags.includes(t) ? "active" : ""}
                  key={t}
                  onClick={() =>
                    changeFilters({
                      tags: filters.tags.includes(t)
                        ? filters.tags.filter((x) => x !== t)
                        : [...filters.tags, t],
                    })
                  }
                >
                  {t}
                </button>
              ))}
            </div>
            {showFilters && (
              <div className="filter-panel">
                <label>
                  Includes
                  <select
                    value={filters.type}
                    onChange={(e) => changeFilters({ type: e.target.value })}
                  >
                    <option value="all">Code & prompts</option>
                    <option value="code">HTML + CSS</option>
                    <option value="prompt">Prompt recipes</option>
                  </select>
                </label>
                <label>
                  Format
                  <select
                    value={filters.scope}
                    onChange={(e) => changeFilters({ scope: e.target.value })}
                  >
                    <option value="all">Components & pages</option>
                    <option value="component">Components</option>
                    <option value="page">Single pages</option>
                  </select>
                </label>
                <button
                  className="text-button"
                  onClick={() =>
                    changeFilters({
                      q: "",
                      tags: [],
                      type: "all",
                      scope: "all",
                      sort: "newest",
                    })
                  }
                >
                  Reset filters
                </button>
              </div>
            )}
          </section>
          <div className="results-toolbar">
            <div>
              <LayoutGrid size={15} />
              <strong>
                {creator
                  ? "Creator’s designs"
                  : route === "stars"
                    ? "Saved for later"
                    : route === "mine"
                      ? "Your designs"
                      : "The collection"}
              </strong>
              <span>
                {filtered.length} {filtered.length === 1 ? "design" : "designs"}
              </span>
            </div>
            <label className="sort-label">
              <ArrowDown size={13} />
              <select
                aria-label="Sort designs"
                value={filters.sort}
                onChange={(e) => changeFilters({ sort: e.target.value })}
              >
                <option value="newest">Newest first</option>
                <option value="stars">Most starred</option>
                <option value="relevance">Most relevant</option>
              </select>
              <ChevronDown size={12} />
            </label>
          </div>
          {error ? (
            <div role="alert" className="empty-state">
              <h2>We couldn’t load the collection.</h2>
              <p>{error}</p>
              <button className="button" onClick={() => void refresh()}>
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="gallery-grid">
              {[1, 2, 3].map((i) => (
                <div className="skeleton" key={i} />
              ))}
            </div>
          ) : visible.length ? (
            <div className="gallery-grid">
              {visible.map((d) => (
                <div key={d.id}>
                  <DesignCard
                    design={d}
                    starred={stars.includes(d.id)}
                    onOpen={() => navigate("explore", d.id)}
                    onStar={() => void star(d.id)}
                  />
                  {route === "mine" && (
                    <div className="owner-actions">
                      <button
                        onClick={() => {
                          setEditing(d);
                          navigate("submit");
                        }}
                        disabled={d.status === "hidden"}
                      >
                        Edit
                      </button>
                      {d.status === "published" && (
                        <button
                          onClick={async () => {
                            try {
                              await repo.saveDesign({ ...d, status: "draft" });
                              await refresh();
                              notify("Design unpublished.");
                            } catch (e) {
                              notify(String(e));
                            }
                          }}
                        >
                          Unpublish
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setPendingDelete(d);
                          setModal("delete");
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">✳</span>
              <h2>
                {route === "stars"
                  ? "A little inspiration goes a long way."
                  : route === "mine"
                    ? "Your first contribution starts here."
                    : "Nothing here. Yet."}
              </h2>
              <p>
                {route === "stars"
                  ? "Star a design you like and it will be waiting for you here."
                  : route === "mine"
                    ? "Share a component, a page, or the prompt behind a design."
                    : "Try a different search or give your filters a little more room."}
              </p>
              <button
                className="button"
                onClick={() =>
                  route === "mine"
                    ? share()
                    : route === "stars"
                      ? navigate()
                      : changeFilters({
                          q: "",
                          tags: [],
                          type: "all",
                          scope: "all",
                        })
                }
              >
                {route === "mine"
                  ? "Share a design"
                  : route === "stars"
                    ? "Explore designs"
                    : "Clear filters"}
                <ArrowRight size={15} />
              </button>
            </div>
          )}
          {pageCount > 1 && (
            <div className="pagination">
              <button
                className="button"
                disabled={page === 1}
                onClick={() => changeFilters({ page: page - 1 })}
              >
                <ArrowLeft size={14} />
                Previous
              </button>
              <span>
                {page} / {pageCount}
              </span>
              <button
                className="button"
                disabled={page === pageCount}
                onClick={() => changeFilters({ page: page + 1 })}
              >
                Next
                <ArrowRight size={14} />
              </button>
            </div>
          )}
          <section className="contribute">
            <span className="contribute-mark">✳</span>
            <div>
              <h2>Made something good?</h2>
              <p>
                Someone out there is looking for exactly your kind of design.
              </p>
            </div>
            <button className="button" onClick={share}>
              Share it with the community
              <ArrowUpRight size={16} />
            </button>
          </section>
        </main>
      )}
      <footer className="site-footer">
        <span className="footer-brand">csspro.</span>
        <p>A little less generic. A little more you.</p>
        <div>
          <span>Made to be built upon.</span>
          {viewer?.admin && (
            <button onClick={() => navigate("admin")}>
              <Shield size={13} />
              Moderation
            </button>
          )}
          <button onClick={() => setModal("about")}>
            About the project
            <ArrowUpRight size={12} />
          </button>
        </div>
      </footer>
      {modal === "login" && (
        <Modal
          title={repo.demo ? "Try the community preview" : "Welcome to CSS Pro"}
          onClose={() => setModal(null)}
        >
          <div className="auth-body">
            <span className="auth-symbol">✳</span>
            <h3>A place for your good ideas.</h3>
            <p>
              {repo.demo
                ? "Start a local demo session to star designs, publish a sample of your own, and explore the workflow. Your data stays in this browser."
                : "Sign in to save inspiration and share your work. Browsing and downloading are always open."}
            </p>
            {repo.demo ? (
              <button
                className="button primary full"
                onClick={() => void auth("github")}
                disabled={busy}
              >
                Enter local demo
                <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button
                  className="button full"
                  onClick={() => void auth("google")}
                  disabled={busy}
                >
                  Continue with Google
                </button>
                <button
                  className="button full"
                  onClick={() => void auth("github")}
                  disabled={busy}
                >
                  <Github size={18} />
                  Continue with GitHub
                </button>
              </>
            )}
            <small>
              {repo.demo
                ? "This is not a production account."
                : "By continuing, you agree to share only work you have the right to distribute."}
            </small>
          </div>
        </Modal>
      )}
      {modal === "about" && (
        <Modal title="Good design, shared." onClose={() => setModal(null)}>
          <div className="about-body">
            <p className="large-copy">
              The internet doesn’t need more websites that look the same.
            </p>
            <p>
              CSS Pro is a home for thoughtful web designs and the code or
              prompts behind them. Find something that feels right, understand
              what makes it work, then make it your own.
            </p>
            <div className="about-steps">
              <p>
                <Search size={19} />
                <strong>Find your style.</strong> Browse by visual direction.
              </p>
              <p>
                <Code2 size={19} />
                <strong>Take a starting point.</strong> Download code or copy a
                prompt.
              </p>
              <p>
                <Sparkles size={19} />
                <strong>Build something yours.</strong> Bring it to your AI
                builder.
              </p>
            </div>
            {repo.demo && (
              <div className="notice">
                <strong>You’re in the local preview.</strong>
                <p>
                  The collection contains original labeled samples. Stars and
                  submissions are saved only in this browser. Production
                  accounts and community data require the Supabase setup
                  described in the project README.
                </p>
              </div>
            )}
            <p className="muted">
              Shared code and prompt text use the MIT license. Preserve creator
              credits and follow any included asset attribution.
            </p>
          </div>
        </Modal>
      )}
      {modal === "report" && detail && (
        <Modal title="Report this design" onClose={() => setModal(null)}>
          <div className="dialog-body">
            <p>
              Tell us what needs attention: attribution, inappropriate content,
              spam, or another concern.
            </p>
            <label>
              Reason
              <textarea
                rows={4}
                maxLength={1000}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              />
            </label>
            <button
              className="button primary full"
              disabled={busy || reportReason.trim().length < 10}
              onClick={async () => {
                setBusy(true);
                try {
                  await repo.reportDesign(detail.id, reportReason.trim());
                  await refresh();
                  setModal(null);
                  setReportReason("");
                  notify(
                    "Report sent. Thank you for helping keep this space useful.",
                  );
                } catch (e) {
                  notify(String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Send report
            </button>
            <small>Please provide at least 10 characters.</small>
          </div>
        </Modal>
      )}
      {modal === "delete" && pendingDelete && (
        <Modal title="Delete this design?" onClose={() => setModal(null)}>
          <div className="dialog-body">
            <p>
              “{pendingDelete.title}” and its uploaded files will be removed.
              This cannot be undone.
            </p>
            <div className="form-actions">
              <button className="button" onClick={() => setModal(null)}>
                Keep design
              </button>
              <button
                className="button danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await repo.deleteDesign(pendingDelete.id);
                    await refresh();
                    setModal(null);
                    notify("Design deleted.");
                  } catch (e) {
                    notify(String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Delete design
              </button>
            </div>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
