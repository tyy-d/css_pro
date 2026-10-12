import { ArrowUpRight, Code2, Sparkles, Star } from "lucide-react";
import type { DesignSummary } from "../lib/types";
export function DesignCard({
  design: d,
  starred,
  onOpen,
  onStar,
}: {
  design: DesignSummary;
  starred: boolean;
  onOpen: () => void;
  onStar: () => void;
}) {
  return (
    <article className="design-card">
      <button
        className="card-image"
        onClick={onOpen}
        aria-label={`View ${d.title}`}
      >
        <img
          src={d.assets.find((a) => a.kind === "screenshot")?.url}
          alt={`${d.title} design preview`}
          loading="lazy"
          onError={e => { e.currentTarget.style.visibility = "hidden"; e.currentTarget.parentElement?.setAttribute("data-image-error", "Preview unavailable — open design to retry"); }}
        />
        <span className="card-type">
          {d.type === "code" ? <Code2 size={13} /> : <Sparkles size={13} />}{" "}
          {d.type === "code" ? "HTML + CSS" : "Prompt recipe"}
        </span>
        <span className="card-open">
          <ArrowUpRight size={19} />
        </span>
        {d.status !== "published" && (
          <span className="status-badge">{d.status}</span>
        )}
      </button>
      <div className="card-info">
        <div>
          <button className="card-title" onClick={onOpen}>
            {d.title}
          </button>
          <div className="creator-line">
            <span className="tiny-avatar">{d.creator.slice(0, 1)}</span>
            {d.creator}
            {d.sample && <span className="sample-label">Sample</span>}
          </div>
        </div>
        <button
          className={`star-button ${starred ? "is-starred" : ""}`}
          onClick={onStar}
          aria-label={`${starred ? "Unstar" : "Star"} ${d.title}`}
          aria-pressed={starred}
        >
          <Star size={16} fill={starred ? "currentColor" : "none"} />
          <span>{d.stars}</span>
        </button>
      </div>
      <div className="card-tags">
        {d.tags.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </article>
  );
}
