import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, BarChart3, Eye, EyeOff, X, Image as ImageIcon, Film as FilmIcon, Clapperboard, Check } from "lucide-react";
import { BilingualField } from "@/components/admin/bilingual-field";
import { TwoClickDelete } from "@/components/admin/two-click-delete";
import { FileUpload } from "@/components/admin/file-upload";
import { capitalize } from "@/lib/cms";
import { getFilmVideoUrl, setFilmVideoUrl, listFilmsWithVideo } from "@/lib/admin-films.functions";

export const Route = createFileRoute("/_authenticated/admin/films")({
  component: FilmsAdminPage,
});

type Film = {
  id: string;
  slug: string;
  title_en: string;
  title_fa: string | null;
  director_en: string | null;
  director_fa: string | null;
  synopsis_en: string | null;
  synopsis_fa: string | null;
  category: string | null;
  year: number | null;
  duration_min: number | null;
  price_cents: number;
  price_toman: number;
  ticket_hours: number;
  access_mode: string;
  access_type: "membership" | "ppv_only" | "membership_or_ppv" | "free";
  is_premium: boolean;
  visibility: string;
  sort_order: number;
  cover_url: string | null;
  thumbnail_url: string | null;
  poster_gradient: string | null;
  video_url?: string | null;
  preview_url: string | null;
};

type CreditDraft = {
  id?: string;
  enabled: boolean;
  credit_type: string;
  label_en?: string | null;
  value_en: string;
  value_fa: string;
  sort_order: number;
};

type FilmDraft = Omit<Film, "id"> & { id?: string };

const GRADIENTS = [
  "linear-gradient(155deg,#3d2c19,#0e0a06 72%)",
  "linear-gradient(155deg,#4a3318,#120c06 72%)",
  "linear-gradient(155deg,#312316,#0c0906 72%)",
  "linear-gradient(155deg,#44301c,#100a06 72%)",
  "linear-gradient(155deg,#2b2117,#0b0806 72%)",
  "linear-gradient(155deg,#4a3920,#0e0a06 72%)",
];

const EMPTY: FilmDraft = {
  slug: "", title_en: "", title_fa: "", director_en: "", director_fa: "",
  synopsis_en: "", synopsis_fa: "", category: "", year: null, duration_min: null,
  price_cents: 0, price_toman: 0, ticket_hours: 48, access_mode: "inherit",
  access_type: "membership", is_premium: false,
  visibility: "draft", sort_order: 0, cover_url: "", thumbnail_url: "", poster_gradient: GRADIENTS[0],
  video_url: "", preview_url: "",
};

async function listFilms(): Promise<Film[]> {
  const { data, error } = await supabase
    .from("films").select("id, slug, title_en, title_fa, synopsis_en, synopsis_fa, director_en, director_fa, category, year, duration_min, price_cents, price_toman, ticket_hours, access_mode, access_type, is_premium, poster_gradient, cover_url, thumbnail_url, preview_url, visibility, sort_order, age_rating, has_4k, has_captions, has_subtitles, created_at, updated_at")
    .order("sort_order").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Film[]) ?? [];
}

async function listCategoryIds(): Promise<string[]> {
  const { data } = await supabase.from("categories").select("id").order("sort_order");
  return (data ?? []).map((c) => c.id);
}

function FilmsAdminPage() {
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: films = [], isLoading } = useQuery({ queryKey: ["admin", "films"], queryFn: listFilms });
  const { data: categories = [] } = useQuery({ queryKey: ["admin", "category-ids"], queryFn: listCategoryIds });
  const { data: videoIds = [] } = useQuery({
    queryKey: ["admin", "films-with-video"],
    queryFn: async () => (await listFilmsWithVideo()).ids,
  });
  const videoIdSet = new Set(videoIds);
  const [editing, setEditing] = useState<FilmDraft | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (pathname.startsWith("/admin/films/")) return <Outlet />;

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("films").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin", "films"] }); },
    onError: (e) => toast.error(e.message),
  });

  const bulkVisibility = useMutation({
    mutationFn: async (args: { ids: string[]; visibility: "published" | "draft" }) => {
      const { error } = await supabase.from("films").update({ visibility: args.visibility }).in("id", args.ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, vars) => {
      toast.success(`${vars.ids.length} film${vars.ids.length === 1 ? "" : "s"} ${vars.visibility === "published" ? "published" : "unpublished"}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin", "films"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("films").delete().in("id", ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, ids) => { toast.success(`${ids.length} deleted`); setSelected(new Set()); qc.invalidateQueries({ queryKey: ["admin", "films"] }); },
    onError: (e) => toast.error(e.message),
  });

  const allIds = films.map((f) => f.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;
  const selectedIds = Array.from(selected);

  return (
    <div className="p-8 max-w-6xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Films</h1>
          <p className="mt-1 text-sm text-muted-foreground">Add, edit, publish or remove short films.</p>
        </div>
        <button type="button" onClick={() => setEditing({ ...EMPTY })} className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3.5 py-2 text-sm font-medium hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Film
        </button>
      </header>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 w-10">
                <input type="checkbox" aria-label="Select all" checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(allIds))}
                  className="h-4 w-4 rounded border-border accent-primary" />
              </th>
              <th className="px-4 py-3">Film</th>
              <th className="px-4 py-3 w-40">Assets</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 w-48">Pricing</th>
              <th className="px-4 py-3 w-28">Status</th>
              <th className="px-4 py-3 w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && films.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                No films yet. Click <span className="text-foreground">Add Film</span> to create one.
              </td></tr>
            )}
            {films.map((f) => {
              const isChecked = selected.has(f.id);
              return (
                <tr key={f.id} className={isChecked ? "bg-primary/5" : undefined}>
                  <td className="px-4 py-3">
                    <input type="checkbox" aria-label={`Select ${f.title_en}`} checked={isChecked}
                      onChange={() => {
                        const next = new Set(selected);
                        next.has(f.id) ? next.delete(f.id) : next.add(f.id);
                        setSelected(next);
                      }}
                      className="h-4 w-4 rounded border-border accent-primary" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {f.cover_url ? (
                        <img src={f.cover_url} alt="" loading="lazy"
                          className="h-14 w-10 rounded object-cover shrink-0 ring-1 ring-border" />
                      ) : (
                        <div className="h-14 w-10 rounded shrink-0 flex items-center justify-center ring-1 ring-border"
                          style={{ background: f.poster_gradient ?? GRADIENTS[0] }}>
                          <ImageIcon className="h-4 w-4 text-muted-foreground/60" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{f.title_en}</div>
                        {f.title_fa && <div className="text-xs text-muted-foreground" dir="rtl">{f.title_fa}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AssetBadge label="Thumb" present={!!f.thumbnail_url} url={f.thumbnail_url} kind="image" icon={<ImageIcon className="h-3 w-3" />} />
                      <AssetBadge label="Trailer" present={!!f.preview_url} url={f.preview_url} kind="video" icon={<Clapperboard className="h-3 w-3" />} />
                      <AssetBadge label="Video" present={videoIdSet.has(f.id)} url={null} kind="video" icon={<FilmIcon className="h-3 w-3" />} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{f.category ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    <PricingCell film={f} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                      f.visibility === "published" ? "bg-emerald-500/15 text-emerald-400" :
                      f.visibility === "unlisted" ? "bg-amber-500/15 text-amber-400" :
                      "bg-muted text-muted-foreground"
                    }`}>{capitalize(f.visibility)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        to="/admin/films/$filmId/analytics"
                        params={{ filmId: f.id }}
                        aria-label={`Analytics for ${f.title_en}`}
                        title="Analytics"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditing(f)}
                        aria-label={`Edit ${f.title_en}`}
                        title="Edit"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <TwoClickDelete iconOnly onConfirm={() => remove.mutate(f.id)} className="h-9 w-9 justify-center" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border border-border bg-background/95 backdrop-blur px-3 py-2 shadow-2xl">
          <span className="px-2 text-sm text-muted-foreground">{selected.size} selected</span>
          <div className="h-5 w-px bg-border" />
          <button type="button" onClick={() => bulkVisibility.mutate({ ids: selectedIds, visibility: "published" })}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm hover:bg-accent">
            <Eye className="h-4 w-4" /> Publish
          </button>
          <button type="button" onClick={() => bulkVisibility.mutate({ ids: selectedIds, visibility: "draft" })}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm hover:bg-accent">
            <EyeOff className="h-4 w-4" /> Unpublish
          </button>
          <TwoClickDelete onConfirm={() => bulkDelete.mutate(selectedIds)} label={`Delete ${selected.size}`} />
          <button type="button" onClick={() => setSelected(new Set())} className="inline-flex items-center gap-1.5 rounded-full p-1.5 text-sm text-muted-foreground hover:bg-accent" aria-label="Clear">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {editing && (
        <FilmEditorModal
          draft={editing}
          categories={categories}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin", "films"] }); qc.invalidateQueries({ queryKey: ["admin", "films-with-video"] }); }}
        />
      )}
    </div>
  );
}

function AssetBadge({ label, present, url, kind, icon }: {
  label: string; present: boolean; url: string | null; kind: "image" | "video"; icon: React.ReactNode;
}) {
  const base = "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ring-1";
  if (!present) {
    return (
      <span className={`${base} bg-muted/40 text-muted-foreground/60 ring-border/60`} title={`${label}: not set`}>
        {icon}{label}
      </span>
    );
  }
  if (kind === "image" && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" title={`${label}: view`}
        className={`${base} bg-emerald-500/10 text-emerald-400 ring-emerald-500/30 hover:bg-emerald-500/20`}>
        <img src={url} alt="" className="h-3 w-3 rounded-sm object-cover" />
        {label}
      </a>
    );
  }
  return (
    <a href={url ?? "#"} target="_blank" rel="noreferrer" title={`${label}: view`}
      className={`${base} bg-emerald-500/10 text-emerald-400 ring-emerald-500/30 hover:bg-emerald-500/20`}>
      <Check className="h-3 w-3" />{label}
    </a>
  );
}

function PricingCell({ film }: { film: Film }) {
  const muted = "text-muted-foreground";
  if (film.access_type === "free") {
    return <span className="inline-flex rounded-full px-2 py-0.5 bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">Free</span>;
  }
  if (film.access_type === "membership") {
    return <span className="inline-flex rounded-full px-2 py-0.5 bg-primary/10 text-primary ring-1 ring-primary/30">Included in Membership</span>;
  }
  const hasPrice = (film.price_cents ?? 0) > 0 || (film.price_toman ?? 0) > 0;
  if (!hasPrice) {
    return <span className={`inline-flex rounded-full px-2 py-0.5 bg-muted/40 ${muted} ring-1 ring-border`}>No Price Set</span>;
  }
  const label = film.access_type === "membership_or_ppv" ? "Members or " : "";
  return (
    <div className="space-y-0.5">
      {label && <div className={`text-[10px] ${muted}`}>{label.trim()}</div>}
      <div className="tabular-nums">
        ${(film.price_cents / 100).toFixed(2)} <span className={muted}>·</span>{" "}
        <span dir="rtl">{film.price_toman.toLocaleString()} تومان</span>
      </div>
    </div>
  );
}

const inp = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

const CREDIT_TYPES: { value: string; label: string }[] = [
  { value: "cast", label: "Cast" },
  { value: "producer", label: "Producer" },
  { value: "writer", label: "Writer" },
  { value: "cinematographer", label: "Cinematographer" },
  { value: "composer", label: "Music Composer" },
  { value: "editor", label: "Editor" },
  { value: "sound", label: "Sound Designer" },
  { value: "custom", label: "Other credit…" },
];

function FilmEditorModal({
  draft, categories, onCancel, onSaved,
}: {
  draft: FilmDraft;
  categories: string[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState<FilmDraft>(draft);
  const [credits, setCredits] = useState<CreditDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof FilmDraft>(k: K, v: FilmDraft[K]) => setD((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!d.id) { setCredits([]); return; }
    supabase.from("film_credits").select("id, credit_type, label_en, value_en, value_fa, sort_order")
      .eq("film_id", d.id).order("sort_order")
      .then(({ data }) => {
        setCredits((data ?? []).map((c) => ({
          id: c.id, enabled: true, credit_type: c.credit_type,
          label_en: c.label_en, value_en: c.value_en ?? "", value_fa: c.value_fa ?? "",
          sort_order: c.sort_order,
        })));
      });
    // Load video_url via admin server fn (column is hidden from clients).
    getFilmVideoUrl({ data: { id: d.id } })
      .then((res) => setD((p) => ({ ...p, video_url: res.videoUrl ?? "" })))
      .catch(() => {});
  }, [d.id]);

  const pricingVisible = d.access_mode !== "free";

  async function save() {
    setSaving(true);
    try {
      const payload = {
        slug: d.slug.trim(),
        title_en: d.title_en.trim(),
        title_fa: d.title_fa?.trim() || null,
        director_en: d.director_en?.trim() || null,
        director_fa: d.director_fa?.trim() || null,
        synopsis_en: d.synopsis_en?.trim() || null,
        synopsis_fa: d.synopsis_fa?.trim() || null,
        category: d.category || null,
        year: d.year ?? null,
        duration_min: d.duration_min ?? null,
        price_cents: Number(d.price_cents) || 0,
        price_toman: Number(d.price_toman) || 0,
        ticket_hours: Number(d.ticket_hours) || 48,
        access_mode: d.access_mode,
        access_type: d.access_type,
        is_premium: !!d.is_premium,
        visibility: d.visibility,
        sort_order: Number(d.sort_order) || 0,
        cover_url: d.cover_url?.trim() || null,
        thumbnail_url: d.thumbnail_url?.trim() || null,
        poster_gradient: d.poster_gradient || null,
        preview_url: d.preview_url?.trim() || null,
      };

      let filmId = d.id;
      if (filmId) {
        const { error } = await supabase.from("films").update(payload).eq("id", filmId);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await supabase.from("films").insert(payload).select("id").single();
        if (error) throw new Error(error.message);
        filmId = data.id;
      }

      // Persist video_url through the admin server fn (column is hidden from clients).
      await setFilmVideoUrl({ data: { id: filmId!, videoUrl: d.video_url?.trim() || null } });

      // Replace credits set
      await supabase.from("film_credits").delete().eq("film_id", filmId);
      const enabled = credits.filter((c) => c.enabled && (c.value_en.trim() || c.value_fa.trim()));
      if (enabled.length) {
        const { error } = await supabase.from("film_credits").insert(
          enabled.map((c, i) => ({
            film_id: filmId!,
            credit_type: c.credit_type,
            label_en: c.label_en ?? null,
            value_en: c.value_en.trim() || null,
            value_fa: c.value_fa.trim() || null,
            sort_order: i,
          }))
        );
        if (error) throw new Error(error.message);
      }

      toast.success("Film saved");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl my-8 rounded-lg border border-border bg-background shadow-2xl">
        <header className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
          <h2 className="font-semibold">{d.id ? "Edit film" : "New film"}</h2>
          <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
        </header>

        <div className="p-6 space-y-6">
          {/* Media uploads — Cover, Thumbnail, Trailer, Full Video */}
          <Section
            title="Media"
            description="Upload the four media assets that make up this film. Each is stored separately and can be replaced at any time."
          >
            <div className="space-y-3">
              <FileUpload
                bucket="film-covers"
                kind="image"
                accept="image/jpeg,image/png,image/webp,image/avif"
                value={d.cover_url ?? null}
                onChange={(u) => { set("cover_url", u ?? ""); if (u) set("poster_gradient", ""); }}
                pathPrefix={d.id ?? `new-${d.slug || "film"}`}
                label="Upload Cover (Poster)"
                description="Main portrait poster (~2:3). Used on homepage, film page, collections, search and featured sections. Hi-res JPG, PNG, WebP or AVIF."
                maxBytes={25 * 1024 * 1024}
              />
              <FileUpload
                bucket="film-thumbnails"
                kind="image"
                accept="image/jpeg,image/png,image/webp,image/avif"
                value={d.thumbnail_url ?? null}
                onChange={(u) => set("thumbnail_url", u ?? "")}
                pathPrefix={d.id ?? `new-${d.slug || "film"}`}
                label="Upload Thumbnail"
                description="Landscape thumbnail (~16:9) used for grids, suggestions and previews."
                maxBytes={15 * 1024 * 1024}
              />
              <FileUpload
                bucket="film-trailers"
                kind="video"
                accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
                value={d.preview_url ?? null}
                onChange={(u) => set("preview_url", u ?? "")}
                pathPrefix={d.id ?? `new-${d.slug || "film"}`}
                label="Upload Trailer"
                description="Short preview clip shown on the film page and marketing surfaces. MP4 / WebM / MOV."
                maxBytes={500 * 1024 * 1024}
              />
              <FileUpload
                bucket="film-videos"
                kind="video"
                accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
                value={d.video_url ?? null}
                onChange={(u) => set("video_url", u ?? "")}
                pathPrefix={d.id ?? `new-${d.slug || "film"}`}
                label="Upload Video (Full Film)"
                description="The full feature. MP4 / WebM / MOV / MKV. Large files are supported — progress is shown as the upload runs."
                maxBytes={5 * 1024 * 1024 * 1024}
              />
            </div>

            <div className="mt-5 rounded-md border border-border p-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Fallback colour cover</div>
              <p className="text-xs text-muted-foreground mb-2">Used only when no cover image is uploaded.</p>
              <div className="flex gap-2">
                {GRADIENTS.map((g) => (
                  <button key={g} type="button" onClick={() => set("poster_gradient", g)}
                    className={`h-9 w-9 rounded-md border-2 ${d.poster_gradient === g && !d.cover_url ? "border-primary" : "border-border"}`}
                    style={{ background: g }} />
                ))}
              </div>
            </div>

            <label className="block mt-4">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">Slug (URL) *</span>
              <input required value={d.slug} onChange={(e) => set("slug", e.target.value)} placeholder="the-pomegranate-house" className={inp} />
            </label>
          </Section>


          <Section title="Title">
            <BilingualField label="Title" value={{ en: d.title_en, fa: d.title_fa ?? "" }} onChange={(v) => { set("title_en", v.en); set("title_fa", v.fa); }} placeholderEn="The Pomegranate House" placeholderFa="خانه‌ی انار" />
          </Section>

          <Section title="Description / Synopsis">
            <BilingualField label="Synopsis" value={{ en: d.synopsis_en ?? "", fa: d.synopsis_fa ?? "" }} onChange={(v) => { set("synopsis_en", v.en); set("synopsis_fa", v.fa); }} textarea rows={3} />
          </Section>

          <Section title="Details">
            <BilingualField label="Director" value={{ en: d.director_en ?? "", fa: d.director_fa ?? "" }} onChange={(v) => { set("director_en", v.en); set("director_fa", v.fa); }} />
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <label className="block">
                <span className="block text-xs font-medium text-muted-foreground mb-1.5">Category</span>
                <select value={d.category ?? ""} onChange={(e) => set("category", e.target.value || null)} className={inp}>
                  <option value="">—</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-muted-foreground mb-1.5">Year</span>
                <input type="number" value={d.year ?? ""} onChange={(e) => set("year", e.target.value ? Number(e.target.value) : null)} className={inp} placeholder="2025" />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-muted-foreground mb-1.5">Duration (min)</span>
                <input type="number" value={d.duration_min ?? ""} onChange={(e) => set("duration_min", e.target.value ? Number(e.target.value) : null)} className={inp} placeholder="14" />
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Year and duration appear automatically in Persian digits on the Persian site.
            </p>
          </Section>

          <Section title="Credits (optional)" description="Tick a credit to add it. Enabled credits appear on the film page in both languages; unticked ones stay hidden.">
            <div className="space-y-2">
              {credits.map((c, i) => (
                <div key={i} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={c.enabled} onChange={(e) => setCredits(credits.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))} className="h-4 w-4 accent-primary" />
                      <span className="capitalize font-medium">{c.credit_type === "custom" ? (c.label_en || "Custom credit") : c.credit_type}</span>
                    </label>
                    <button type="button" onClick={() => setCredits(credits.filter((_, j) => j !== i))} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
                  </div>
                  {c.credit_type === "custom" && (
                    <input value={c.label_en ?? ""} onChange={(e) => setCredits(credits.map((x, j) => j === i ? { ...x, label_en: e.target.value } : x))} placeholder="Custom label (EN)" className={`${inp} mb-2`} />
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input value={c.value_en} onChange={(e) => setCredits(credits.map((x, j) => j === i ? { ...x, value_en: e.target.value } : x))} placeholder="Name (EN)" className={inp} />
                    <input value={c.value_fa} dir="rtl" onChange={(e) => setCredits(credits.map((x, j) => j === i ? { ...x, value_fa: e.target.value } : x))} placeholder="نام (FA)" className={inp} />
                  </div>
                </div>
              ))}
            </div>
            <AddCredit onAdd={(t) => setCredits([...credits, { enabled: true, credit_type: t, value_en: "", value_fa: "", sort_order: credits.length, label_en: t === "custom" ? "" : null }])} />
          </Section>

          <Section title="External video URLs" description="Optional — use these only when hosting on Mux, Cloudflare Stream, Bunny or Vimeo instead of uploading above. The uploader fills these fields automatically.">
            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">Full film URL</span>
              <input value={d.video_url ?? ""} onChange={(e) => set("video_url", e.target.value)} placeholder="https://…" className={inp} />
            </label>
            <label className="block mt-3">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">Trailer / preview URL</span>
              <input value={d.preview_url ?? ""} onChange={(e) => set("preview_url", e.target.value)} placeholder="https://…" className={inp} />
            </label>
          </Section>


          <Section title="Membership access" description="How members and visitors can watch this film.">
            <div className="space-y-2">
              {([
                { v: "membership", t: "Included in Membership", s: "Members watch free. Non-members are shown the trial CTA." },
                { v: "membership_or_ppv", t: "Membership + Individual Purchase", s: "Members watch free. Non-members can join, or buy a single ticket." },
                { v: "ppv_only", t: "Pay-Per-View Only", s: "Premium release. Members and non-members both pay separately." },
                { v: "free", t: "Free to Watch", s: "Anyone signed in can watch without membership or ticket." },
              ] as const).map((o) => (
                <label key={o.v} className={`block cursor-pointer rounded-md border p-3 transition-colors ${d.access_type === o.v ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}>
                  <input type="radio" name="fAccessType" checked={d.access_type === o.v} onChange={() => set("access_type", o.v)} className="sr-only" />
                  <div className="text-sm font-medium">{o.t}</div>
                  <div className="text-xs text-muted-foreground">{o.s}</div>
                </label>
              ))}
            </div>
            <label className="mt-4 flex items-start gap-3 cursor-pointer rounded-md border border-border p-3 hover:bg-accent">
              <input type="checkbox" checked={!!d.is_premium} onChange={(e) => set("is_premium", e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border accent-primary" />
              <div>
                <div className="text-sm font-medium">Premium release badge</div>
                <div className="text-xs text-muted-foreground">Adds a "Premium Release" badge on the film card and detail page.</div>
              </div>
            </label>
          </Section>

          <Section title="Legacy access mode" description="Older free/paid setting — used as a fallback if no membership.">
            <div className="space-y-2">
              {([
                { v: "inherit", t: "Use site default", s: "Follows the site-wide Free / Paid setting on the Homepage." },
                { v: "free", t: "Free — Watch Free + Support the filmmaker", s: "Anyone can watch this film; viewers can optionally support." },
                { v: "paid", t: "Paid — Pay & Watch", s: "Viewers buy a ticket for this film before watching." },
              ] as const).map((o) => (
                <label key={o.v} className={`block cursor-pointer rounded-md border p-3 transition-colors ${d.access_mode === o.v ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}>
                  <input type="radio" name="fAccess" checked={d.access_mode === o.v} onChange={() => set("access_mode", o.v)} className="sr-only" />
                  <div className="text-sm font-medium">{o.t}</div>
                  <div className="text-xs text-muted-foreground">{o.s}</div>
                </label>
              ))}
            </div>
          </Section>

          {pricingVisible && (
            <Section title="Pricing">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="block">
                  <span className="block text-xs font-medium text-muted-foreground mb-1.5">Ticket — International (USD)</span>
                  <input type="number" step="0.01" value={(d.price_cents / 100).toFixed(2)} onChange={(e) => set("price_cents", Math.round(Number(e.target.value) * 100))} className={inp} placeholder="4.99" />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-muted-foreground mb-1.5">قیمت بلیت — تومان</span>
                  <input type="number" step="1000" dir="rtl" value={d.price_toman} onChange={(e) => set("price_toman", Number(e.target.value))} className={inp} placeholder="120000" />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-muted-foreground mb-1.5">Viewing window (hours)</span>
                  <input type="number" value={d.ticket_hours} onChange={(e) => set("ticket_hours", Number(e.target.value))} className={inp} placeholder="48" />
                </label>
              </div>
            </Section>
          )}

          <Section title="Visibility">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([
                { v: "published", t: "Published", s: "Visible to everyone on the site" },
                { v: "unlisted", t: "Unlisted", s: "Only people with the link can see it" },
                { v: "draft", t: "Draft", s: "Hidden — not on the site yet" },
              ] as const).map((o) => (
                <label key={o.v} className={`cursor-pointer rounded-md border p-3 transition-colors ${d.visibility === o.v ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}>
                  <input type="radio" name="fVis" checked={d.visibility === o.v} onChange={() => set("visibility", o.v)} className="sr-only" />
                  <div className="text-sm font-medium">{o.t}</div>
                  <div className="text-xs text-muted-foreground">{o.s}</div>
                </label>
              ))}
            </div>
          </Section>
        </div>

        <footer className="px-6 py-4 border-t border-border flex items-center gap-3 sticky bottom-0 bg-background">
          <button type="button" onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
          <div className="flex-1" />
          {d.id && (
            <Link to="/admin/films/$filmId/analytics" params={{ filmId: d.id }} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">View analytics</Link>
          )}
          <button type="button" onClick={save} disabled={saving} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Save Film"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      {description && <p className="text-xs text-muted-foreground mb-3">{description}</p>}
      {children}
    </section>
  );
}

function AddCredit({ onAdd }: { onAdd: (t: string) => void }) {
  const [t, setT] = useState("cast");
  return (
    <div className="flex gap-2 mt-3">
      <select value={t} onChange={(e) => setT(e.target.value)} className={`${inp} w-auto`}>
        {CREDIT_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <button type="button" onClick={() => onAdd(t)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
        + Add credit
      </button>
    </div>
  );
}
