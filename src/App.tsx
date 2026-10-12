import { useCallback, useEffect, useRef, useState } from "react";
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
import type {
  Design,
  DesignSummary,
  EditorDraft,
  Collection,
  Report,
  Viewer,
} from "./lib/types";
import { TAGS } from "./lib/types";
import * as repo from "./lib/repository";
import { readFilters, type Filters } from "./lib/search";
import { DesignCard } from "./components/DesignCard";
import { Detail } from "./components/Detail";
import { Submit } from "./components/Submit";
import { Modal } from "./components/Modal";
import { consumeAuthError, routeAccess } from "./lib/auth";
import { rememberIntent, consumeIntent } from "./lib/authIntent";
export default function App() {
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
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
  const [editing, setEditing] = useState<EditorDraft | undefined>();
  const [modal, setModal] = useState<
    "login" | "about" | "report" | "delete" | "profile" | null
  >(null);
  const [displayName, setDisplayName] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DesignSummary | null>(
    null,
  );
  const notify = useCallback((s: string) => setToast(s), []);
  const [detail, setDetail] = useState<Design | null>(null);
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const unsaved = useRef(false);
  const currentUrl = useRef(location.pathname + location.search);
  const onDirtyChange = useCallback((dirty: boolean) => {
    unsaved.current = dirty;
  }, []);
  const refreshVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    try {
      const [v, ss] = await Promise.all([repo.getViewer(), repo.getStars()]);
      const nextReports = v?.admin ? await repo.listReports() : [];
      if (version !== refreshVersion.current) return;
      setReports(nextReports);
      setViewer(v);
      if (v) {
        const intent = consumeIntent();
        if (intent) {
          history.replaceState({}, "", intent.path);
          const params = new URLSearchParams(location.search);
          setRoute(
            intent.action === "share"
              ? "submit"
              : params.get("view") || "explore",
          );
          setDetailId(intent.designId || params.get("design"));
          setFilters(readFilters());
          if (intent.action === "star" && intent.designId) {
            await repo.toggleStar(intent.designId, true);
            ss.push(intent.designId);
          }
          if (intent.action === "report") setModal("report");
        }
      }
      setRevision((n) => n + 1);
      setStars(ss);
      setError("");
    } catch (e) {
      if (version !== refreshVersion.current) return;
      setViewer(null);
      setDesigns([]);
      setStars([]);
      setReports([]);
      setError(
        e instanceof Error
          ? e.message
          : "Could not load designs. Check your connection and try again.",
      );
    } finally {
      if (version === refreshVersion.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const authError = consumeAuthError();
    if (authError) {
      const intent = consumeIntent();
      if (intent) {
        history.replaceState({}, "", intent.path);
        const params = new URLSearchParams(location.search);
        setRoute(params.get("view") || "explore");
        setDetailId(intent.designId || params.get("design"));
        setFilters(readFilters());
      }
      notify(authError);
    }
    void refresh();
    const sub = repo.supabase?.auth.onAuthStateChange(() => {
      ++refreshVersion.current;
      setLoading(true);
      setViewer(null);
      setDesigns([]);
      setStars([]);
      setReports([]);
      setEditing(undefined);
      setDetail(null);
      setModal(null);
      repo.clearPrivateState();
      setTimeout(() => void refresh(), 0);
    });
    return () => sub?.data.subscription.unsubscribe();
  }, [refresh, notify]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const pop = () => {
      if (unsaved.current && !confirm("Leave without saving your changes?")) {
        history.pushState({}, "", currentUrl.current);
        return;
      }
      currentUrl.current = location.pathname + location.search;
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
    if (unsaved.current && !confirm("Leave without saving your changes?"))
      return;
    unsaved.current = false;
    const p = new URLSearchParams(location.search);
    if (!id && !detailId && view !== route) {
      ["q", "tag", "type", "scope", "sort", "page"].forEach((k) => p.delete(k));
      setFilters({
        q: "",
        tags: [],
        type: "all",
        scope: "all",
        sort: "newest",
        page: 1,
      });
    }
    p.delete("view");
    p.delete("design");
    p.delete("creator");
    p.delete("edit");
    if (view !== "explore") p.set("view", view);
    if (id) p.set("design", id);
    if (creatorId) p.set("creator", creatorId);
    history.pushState({}, "", p.size ? `?${p}` : location.pathname);
    currentUrl.current = location.pathname + location.search;
    setRoute(view);
    setDetailId(id || null);
    setCreator(creatorId || null);
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
      navigate("submit");
      rememberIntent("share");
      setModal("login");
      return;
    }
    setEditing(undefined);
    navigate("submit");
  }
  async function star(id: string) {
    if (!viewer) {
      rememberIntent("star", id);
      setModal("login");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const active = !stars.includes(id);
      setStars((v) => (active ? [...v, id] : v.filter((x) => x !== id)));
      setDesigns((v) =>
        v.map((d) =>
          d.id === id ? { ...d, stars: d.stars + (active ? 1 : -1) } : d,
        ),
      );
      setDetail((d) =>
        d?.id === id ? { ...d, stars: d.stars + (active ? 1 : -1) } : d,
      );
      await repo.toggleStar(id, active);
      await refresh();
    } catch (e) {
      await refresh();
      notify(repo.message(e));
    } finally {
      setBusy(false);
    }
  }
  async function auth(provider: "google" | "github") {
    setBusy(true);
    try {
      if (!sessionStorage.getItem("css-pro-auth-intent")) rememberIntent();
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
  useEffect(() => {
    let live = true;
    setLoading(true);
    setDetail(null);
    const collection: Collection =
      route === "admin"
        ? "hidden"
        : route === "mine" || route === "stars"
          ? route
          : "explore";
    const load = async () => {
      try {
        if (detailId) {
          const value = await repo.getDesign(detailId);
          if (live) setDetail(value);
        } else {
          const result = await repo.browseDesigns(filters, collection, creator);
          if (live) {
            setDesigns(result.items);
            setTotal(result.total);
          }
        }
        if (live) setError("");
      } catch (e) {
        if (live) {
          setError(repo.message(e));
          setDesigns([]);
        }
      } finally {
        if (live) setLoading(false);
      }
    };
    void load();
    return () => {
      live = false;
    };
  }, [filters, route, creator, detailId, revision]);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("edit");
    if (route !== "submit" || !id || !viewer) return;
    let live = true;
    void repo
      .getEditorDraft(id)
      .then((d) => {
        if (live) setEditing(d);
      })
      .catch((e) => {
        if (live) notify(repo.message(e));
      });
    return () => {
      live = false;
    };
  }, [route, viewer?.id, notify]);
  function persistEditor(id: string) {
    const p = new URLSearchParams(location.search);
    p.set("edit", id);
    history.replaceState({}, "", `?${p}`);
  }
  async function edit(id: string) {
    try {
      const draft = await repo.getEditorDraft(id);
      setEditing(draft);
      navigate("submit");
      persistEditor(id);
    } catch (e) {
      notify(repo.message(e));
    }
  }
  const pageCount = Math.max(1, Math.ceil(total / 9));
  const page = filters.page;
  const visible = designs;
  const access = routeAccess(route, viewer, loading);
  if (repo.configurationError)
    return (
      <main className="empty-state">
        <h1>Community configuration needs attention</h1>
        <p>{repo.configurationError}</p>
        <p>
          Ask the site administrator to correct the production deployment
          configuration.
        </p>
      </main>
    );
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
            onClick={() => navigate("stars")}
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
                onClick={() => {
                  setDisplayName(viewer.name);
                  setModal("profile");
                }}
              >
                Edit profile
              </button>
              <button
                className="icon-btn logout"
                aria-label="Sign out"
                onClick={async () => {
                  try {
                    await repo.signOut();
                    setEditing(undefined);
                    setReports([]);
                    repo.clearPrivateState();
                    await refresh();
                    navigate();
                  } catch (e) {
                    notify(e instanceof Error ? e.message : String(e));
                  }
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
          <button
            className="button primary share-button"
            aria-label="Share a design"
            onClick={share}
          >
            <Plus size={16} />
            <span>Share a design</span>
          </button>
        </div>
      </header>
      {viewer?.suspended && (
        <p role="alert" className="notice">
          Your account is suspended. Publishing, uploads and interactions are
          disabled. Contact the site administrator.
        </p>
      )}
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
      {access === "loading" || access === "login" || access === "denied" ? (
        <main className="empty-state" aria-live="polite">
          <h1>
            {access === "loading"
              ? "Checking your session…"
              : access === "denied"
                ? "Administrator access required"
                : "Sign in to continue"}
          </h1>
          {error && <p role="alert">{error}</p>}
          {access === "login" && (
            <button
              className="button primary"
              onClick={() => setModal("login")}
            >
              Sign in
            </button>
          )}
          <button className="button" onClick={() => navigate()}>
            Back to explore
          </button>
        </main>
      ) : route === "submit" &&
        viewer &&
        new URLSearchParams(location.search).has("edit") &&
        !editing ? (
        <main className="empty-state">
          <h1>Loading your private draft…</h1>
          <button className="button" onClick={() => navigate("mine")}>
            Back to My designs
          </button>
        </main>
      ) : route === "submit" && viewer ? (
        <Submit
          key={editing?.id || "new"}
          initial={editing}
          onDirtyChange={onDirtyChange}
          onPersisted={persistEditor}
          viewer={viewer}
          onClose={() => navigate("mine")}
          onSaved={async (d) => {
            unsaved.current = false;
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
              onBack={() => navigate(route, undefined, creator || undefined)}
              onEdit={() => {
                void edit(detail.id);
              }}
              onReport={() => {
                if (viewer) setModal("report");
                else {
                  rememberIntent("report", detail.id);
                  setModal("login");
                }
              }}
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
                <button
                  className="button"
                  onClick={async () => {
                    try {
                      await repo.moderate(r.design_id, "resolve");
                      await refresh();
                      notify("Report resolved.");
                    } catch (e) {
                      notify(repo.message(e));
                    }
                  }}
                >
                  Resolve report
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
                    {designs[0]?.creator || "Creator"}
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
                {total} {total === 1 ? "design" : "designs"}
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
                    onOpen={() => navigate(route, d.id, creator || undefined)}
                    onStar={() => void star(d.id)}
                  />
                  {route === "mine" && (
                    <div className="owner-actions">
                      <button
                        onClick={() => {
                          void edit(d.id);
                        }}
                        disabled={d.status === "hidden"}
                      >
                        Edit
                      </button>
                      {d.status === "published" && (
                        <button
                          onClick={async () => {
                            try {
                              await repo.unpublishDesign(d.id);
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
      {modal === "profile" && viewer && (
        <Modal title="Public profile" onClose={() => setModal(null)}>
          <label>
            Display name
            <input
              value={displayName}
              maxLength={80}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await repo.updateProfile(displayName);
                await refresh();
                setModal(null);
                notify("Profile updated.");
              } catch (e) {
                notify(repo.message(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Save profile
          </button>
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
