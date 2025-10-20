/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,      // à mettre dans tes variables d'env
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // idem
);

/**
 * Phoning Restaurants — v2
 * - Colonnes: Statut, Dernière MAJ (date), Commentaire, CV envoyé, LM envoyé
 * - Supprime "Suivi"
 * - Renomme "Appelé (répondeur)" -> "Pas de réponse"
 * - KPIs par statut (cliquables pour filtrer)
 * - Import/Export CSV/TSV à jour
 * - Persistance locale via localStorage (pas de serveur)
 */

type Row = {
  id: string;
  restaurant: string;
  adresse: string;
  telephone: string;
  nouveau: string;                // "New" ou ""
  etoiles: "***" | "**" | "*" | "";
  arr: string;                    // 75001...
  statut: string;
  derniereMaj: string;            // yyyy-mm-dd
  commentaire: string;
  cvEnvoye: boolean;
  lmEnvoye: boolean;
};

type Store = {
  rows: Row[];
  statuses: string[];
};

const STORAGE_KEY = "phoning-restos-v2";

const STATUS_COLOR_BG: Record<string, string> = {
  "À contacter": "bg-amber-100",
  "Pas de réponse": "bg-slate-100",
  "Rappel demandé": "bg-blue-100",
  "Rendez-vous pris": "bg-emerald-100",
  "Pas intéressé": "bg-rose-100",
};
const STATUS_COLOR_RING: Record<string, string> = {
  "À contacter": "ring-amber-300",
  "Pas de réponse": "ring-slate-300",
  "Rappel demandé": "ring-blue-300",
  "Rendez-vous pris": "ring-emerald-300",
  "Pas intéressé": "ring-rose-300",
};


const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const defaultStatuses = [
  "À contacter",
  "Pas de réponse",   // ex: "Appelé (répondeur)"
  "Rappel demandé",
  "Rendez-vous pris",
  "Pas intéressé",
];

const seedRows: Row[] = [
  {
    id: "kei",
    restaurant: "Kei",
    adresse: "5 rue Coq Héron, 75001 Paris",
    telephone: "+33 1 42 33 14 74",
    nouveau: "",
    etoiles: "***",
    arr: "75001",
    statut: "",
    derniereMaj: "",
    commentaire: "",
    cvEnvoye: false,
    lmEnvoye: false,
  },
  {
    id: "plenitude",
    restaurant: "Plénitude (Cheval Blanc Paris)",
    adresse: "8 quai du Louvre, 75001 Paris",
    telephone: "+33 1 44 50 10 10",
    nouveau: "",
    etoiles: "***",
    arr: "75001",
    statut: "",
    derniereMaj: "",
    commentaire: "",
    cvEnvoye: false,
    lmEnvoye: false,
  },
  {
    id: "ambroisie",
    restaurant: "L'Ambroisie",
    adresse: "9 place des Vosges, 75004 Paris",
    telephone: "+33 1 42 78 51 45",
    nouveau: "",
    etoiles: "***",
    arr: "75004",
    statut: "",
    derniereMaj: "",
    commentaire: "",
    cvEnvoye: false,
    lmEnvoye: false,
  },
];

function migrateRows(rows: any[]): Row[] {
  return (rows || []).map((r: any, i: number) => ({
    id: r.id ?? `row-${i}`,
    restaurant: r.restaurant ?? "",
    adresse: r.adresse ?? "",
    telephone: r.telephone ?? "",
    nouveau: r.nouveau ?? "",
    etoiles: r.etoiles === "***" || r.etoiles === "**" || r.etoiles === "*" ? r.etoiles : "",
    arr: r.arr ?? "",
    statut: r.statut ?? "",
    derniereMaj: r.derniereMaj ?? "",
    commentaire: r.commentaire ?? "",
    cvEnvoye: !!r.cvEnvoye,
    lmEnvoye: !!r.lmEnvoye,
  }));
}


function loadStoreSafe<T>(fallback: T, key: string): T {
  if (typeof window === "undefined") return fallback; // SSR
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}


function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { rows: seedRows, statuses: defaultStatuses };
    const parsed = JSON.parse(raw);
    return {
      rows: migrateRows(parsed.rows ?? seedRows),
      statuses: parsed.statuses ?? defaultStatuses,
    };
  } catch {
    return { rows: seedRows, statuses: defaultStatuses };
  }
}

function saveStore(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// Couleurs par statut
const STATUS_COLOR: Record<string, string> = {
  "À contacter": "bg-amber-50",
  "Pas de réponse": "bg-slate-50",
  "Rappel demandé": "bg-blue-50",
  "Rendez-vous pris": "bg-emerald-50",
  "Pas intéressé": "bg-rose-50",
};

function statusRowClass(s: string) {
  return STATUS_COLOR[s] ?? "";
}

// Applique une bordure douce au select selon le statut
function statusSelectClass(s: string) {
  if (s === "Rendez-vous pris") return "border-emerald-300";
  if (s === "Rappel demandé") return "border-blue-300";
  if (s === "À contacter") return "border-amber-300";
  if (s === "Pas intéressé") return "border-rose-300";
  if (s === "Pas de réponse") return "border-slate-300";
  return "";
}



export default function Page() {
  const [store, setStore] = useState<Store>({ rows: seedRows, statuses: defaultStatuses });
  const [q, setQ] = useState("");
  const [fStars, setFStars] = useState<string>("all");
  const [fArr, setFArr] = useState<string>("all");
  const [fStatut, setFStatut] = useState<string>("all");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

   useEffect(() => {
   if (typeof window !== "undefined") {
     localStorage.setItem("phoning-restos-v2", JSON.stringify(store));
   }
 }, [store]);

useEffect(() => {
  document.querySelectorAll<HTMLTextAreaElement>('textarea[data-autosize]')
    .forEach(ta => autosize(ta));
}, []);

// Au montage, savoir si on est loggé
const [user, setUser] = useState<null | { email?: string }>(null);
useEffect(() => {
  supabase.auth.getUser().then(({ data }) => setUser(data.user));
  const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
  return () => sub.subscription.unsubscribe();
}, []);


// Charger les lignes depuis Supabase au montage
useEffect(() => {
  (async () => {
    const { data, error } = await supabase
      .from("phoning_rows")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Supabase load error:", error.message);
      return;
    }

    if (data?.length) {
      setStore((s) => ({
        ...s,
        rows: data.map((r: any) => ({
          id: r.id,
          restaurant: r.restaurant,
          adresse: r.adresse ?? "",
          telephone: r.telephone ?? "",
          nouveau: r.nouveau ?? "",
          etoiles: r.etoiles ?? "",
          arr: r.arr ?? "",
          statut: r.statut ?? "",
          derniereMaj: r.derniere_maj ?? "",
          commentaire: r.commentaire ?? "",
          cvEnvoye: !!r.cv_envoye,
          lmEnvoye: !!r.lm_envoye,
        })),
      }));
    }
  })();
}, []);


  const starOptions = useMemo(() => {
    const set = new Set(store.rows.map(r => r.etoiles).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [store.rows]);

  const arrOptions = useMemo(() => {
    const set = new Set(store.rows.map(r => r.arr).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [store.rows]);

  const statutOptions = useMemo(() => ["all", ...store.statuses], [store.statuses]);

  const filtered = useMemo(() => {
    return store.rows.filter(r => {
      if (fStars !== "all" && r.etoiles !== fStars) return false;
      if (fArr !== "all" && r.arr !== fArr) return false;
      if (fStatut !== "all" && r.statut !== fStatut) return false;
      const text = `${r.restaurant} ${r.adresse} ${r.telephone}`.toLowerCase();
      return text.includes(q.toLowerCase());
    });
  }, [store.rows, fStars, fArr, fStatut, q]);

  const kpis = useMemo(() => {
    const m = new Map<string, number>();
    store.statuses.forEach(s => m.set(s, 0));
    store.rows.forEach(r => {
      if (r.statut && m.has(r.statut)) m.set(r.statut, (m.get(r.statut) || 0) + 1);
    });
    return m;
  }, [store.rows, store.statuses]);

  function updateRow(id: string, patch: Partial<Row>) {
  // mise à jour optimiste dans l'UI
  setStore((s) => ({
    ...s,
    rows: s.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  }));

  // upsert Supabase en arrière-plan
  const current = store.rows.find((r) => r.id === id);
  const merged = { ...current, ...patch };
  if (!merged) return;

  supabase
    .from("phoning_rows")
    .upsert({
      id,
      restaurant: merged.restaurant,
      adresse: merged.adresse,
      telephone: merged.telephone,
      nouveau: merged.nouveau,
      etoiles: merged.etoiles,
      arr: merged.arr,
      statut: merged.statut,
      derniere_maj: merged.derniereMaj || null,
      commentaire: merged.commentaire || null,
      cv_envoye: merged.cvEnvoye ?? false,
      lm_envoye: merged.lmEnvoye ?? false,
    })
    .then(({ error }) => {
      if (error) console.error("Supabase upsert error:", error.message);
    });
}


  function exportCSV() {
    const headers = [
      "Restaurant",
      "Adresse",
      "Téléphone",
      "Nouveau",
      "Etoiles",
      "Arr",
      "Statut",
      "Dernière MAJ",
      "Commentaire",
      "CV envoyé",
      "LM envoyé",
    ];
    const lines = store.rows.map(r =>
      [
        r.restaurant,
        r.adresse,
        r.telephone,
        r.nouveau,
        r.etoiles,
        r.arr,
        r.statut,
        r.derniereMaj,
        r.commentaire.replaceAll("\n", " "),
        r.cvEnvoye ? "1" : "0",
        r.lmEnvoye ? "1" : "0",
      ]
        .map(cell => `"${(cell ?? "").toString().replaceAll('"', '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "phoning_restaurants.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseImport(text: string): Row[] {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const delim = lines[0].includes("\t") ? "\t" : ",";
    const cells = (line: string) => (delim === "\t" ? line.split("\t") : splitCSVLine(line));
    const header = cells(lines[0]).map(h => h.trim().toLowerCase());
    const idx = {
      restaurant: header.findIndex(h => h.startsWith("restaurant")),
      adresse: header.findIndex(h => h.startsWith("adresse")),
      telephone: header.findIndex(h => h.startsWith("télé") || h.startsWith("tele")),
      nouveau: header.findIndex(h => h.startsWith("nouveau") || h.includes("new")),
      etoiles: header.findIndex(h => h.startsWith("eto") || h.includes("éto")),
      arr: header.findIndex(h => h.startsWith("arr")),
      statut: header.findIndex(h => h.startsWith("statut")),
      derniereMaj: header.findIndex(h => h.includes("derni") || h.includes("maj") || h.includes("update")),
      commentaire: header.findIndex(h => h.startsWith("comment")),
      cvEnvoye: header.findIndex(h => h.includes("cv")),
      lmEnvoye: header.findIndex(h => h.includes("lm") || h.includes("lettre")),
    };
    const body = lines.slice(1);

    const makeId = (name: string, addr: string, i: number) =>
      (name || "row")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") + "-" + i;

    const rows: Row[] = body
      .map((line, i) => {
        const c = cells(line);
        const get = (k: keyof typeof idx) => (idx[k] >= 0 ? (c[idx[k]] ?? "").trim() : "");
        const name = get("restaurant");
        const addr = get("adresse");
        const tel = get("telephone");
        const etoiles = (get("etoiles") as Row["etoiles"]).replace(/\s+/g, "") as Row["etoiles"];
        const arr = get("arr");
        const statut = get("statut");
        const derniereMaj = normalizeDate(get("derniereMaj"));
        const commentaire = get("commentaire");
        const cvEnvoye = /^(1|true|oui|x)$/i.test(get("cvEnvoye"));
        const lmEnvoye = /^(1|true|oui|x)$/i.test(get("lmEnvoye"));
        const nouveau = get("nouveau");
        return {
          id: makeId(name, addr, i),
          restaurant: name,
          adresse: addr,
          telephone: tel,
          nouveau,
          etoiles: etoiles === "***" || etoiles === "**" || etoiles === "*" ? etoiles : "",
          arr,
          statut,
          derniereMaj,
          commentaire,
          cvEnvoye,
          lmEnvoye,
        } as Row;
      })
      .filter(r => r.restaurant);

    return rows;
  }

  function onImport() {
    const rows = parseImport(importText);
    if (!rows.length) return;
    setStore(s => {
      const map = new Map<string, Row>();
      s.rows.forEach(r => map.set(r.id, r));
      rows.forEach(r => map.set(r.id, { ...(map.get(r.id) ?? ({} as Row)), ...r } as Row));
      return { ...s, rows: Array.from(map.values()) };
    });
    setImportText("");
    setShowImport(false);
  }

  function resetAll() {
    if (!confirm("Réinitialiser toutes les données locales ?")) return;
    setStore({ rows: seedRows, statuses: defaultStatuses });
    setQ("");
    setFArr("all");
    setFStars("all");
    setFStatut("all");
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
  <div>
    <h1 className="text-2xl font-bold">Phoning — Restaurants AVA ⭐</h1>
  </div>

  {/* Auth UI à droite */}
  {!user ? (
    <div className="flex gap-2">
      <input id="loginEmail" placeholder="email" className="rounded border px-2 py-1" />
      <button
        onClick={() =>
          signIn((document.getElementById("loginEmail") as HTMLInputElement).value)
        }
        className="rounded-xl border bg-white px-3 py-2 shadow-sm"
      >
        Se connecter
      </button>
    </div>
  ) : (
    <div className="text-sm flex items-center gap-3">
      <span>Connecté : {user.email}</span>
      <button onClick={signOut} className="rounded-xl border bg-white px-3 py-2 shadow-sm">
        Se déconnecter
      </button>
    </div>
  )}
</header>


        {/* KPIs par statut (cliquables pour filtrer) */}
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
             {store.statuses.map((s) => {
   const active = fStatut === s;
   const bg = STATUS_COLOR_BG[s] ?? "bg-slate-100";
   const ring = STATUS_COLOR_RING[s] ?? "ring-slate-300";
   return (
     <button
       key={s}
       onClick={() => setFStatut(prev => (prev === s ? "all" : s))}
       className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm shadow-sm 
                   ${bg} ring-1 ${ring} ${active ? "font-semibold" : ""}`}
       title="Cliquer pour filtrer"
     >
       <span>{s}</span>
       <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-2 text-xs bg-white/70">
         {kpis.get(s) ?? 0}
       </span>
     </button>
   );
 })}
          </div>
        </section>

        {/* Filtres */}
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12 items-end">
  {/* Recherche — plus étroit (5/12) */}
  <div className="md:col-span-5">
    <label className="block text-xs font-medium text-slate-600">Recherche</label>
    <input
      value={q}
      onChange={e => setQ(e.target.value)}
      placeholder="Nom / adresse / téléphone"
      className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
    />
  </div>

  {/* Étoiles (2/12) */}
  <div className="md:col-span-2">
    <label className="block text-xs font-medium text-slate-600">Étoiles</label>
    <select
      value={fStars}
      onChange={e => setFStars(e.target.value)}
      className="mt-1 w-full rounded-xl border px-3 py-2"
    >
      {starOptions.map(opt => (
        <option key={opt} value={opt}>{opt === "all" ? "Toutes" : opt}</option>
      ))}
    </select>
  </div>

  {/* Arrondissement (2/12) */}
  <div className="md:col-span-2">
    <label className="block text-xs font-medium text-slate-600">Arrondissement</label>
    <select
      value={fArr}
      onChange={e => setFArr(e.target.value)}
      className="mt-1 w-full rounded-xl border px-3 py-2"
    >
      {arrOptions.map(opt => (
        <option key={opt} value={opt}>{opt === "all" ? "Tous" : opt}</option>
      ))}
    </select>
  </div>

  {/* Statut (2/12) */}
  <div className="md:col-span-2">
    <label className="block text-xs font-medium text-slate-600">Statut</label>
    <select
      value={fStatut}
      onChange={e => setFStatut(e.target.value)}
      className="mt-1 w-full rounded-xl border px-3 py-2"
    >
      {statutOptions.map(opt => (
        <option key={opt} value={opt}>{opt === "all" ? "Tous" : opt}</option>
      ))}
    </select>
  </div>

  {/* Bouton Réinitialiser (1/12), aligné à droite */}
  <div className="md:col-span-1 flex md:justify-end">
    <button
      onClick={() => { setQ(""); setFArr("all"); setFStars("all"); setFStatut("all"); }}
      className="mt-6 md:mt-0 rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
      title="Réinitialiser les filtres"
    >
      Réinit.
    </button>
  </div>
</div>


        </section>

        {/* Tableau principal */}
<section className="rounded-2xl border bg-white shadow-sm overflow-x-auto">
  <table className="w-full table-auto border-collapse text-[13px]">
    <thead className="bg-slate-100 text-left">
      <tr>
        <th className="px-2 py-2">Restaurant</th>
        <th className="px-2 py-2">Adresse</th>
        <th className="px-2 py-2 w-[8rem]">Téléphone</th>
        <th className="px-2 py-2 w-[3rem] text-center">New</th>
        <th className="px-2 py-2 w-[3rem] text-center">⭐</th>
        <th className="px-2 py-2 w-[5rem] text-center">Arr</th>
        <th className="px-2 py-2 w-[14rem]">Statut</th>
        <th className="px-2 py-2 w-[10rem]">Dernière MAJ</th>
        <th className="px-2 py-2">Commentaire</th>
        <th className="px-2 py-2 w-[6rem] text-center">CV</th>
        <th className="px-2 py-2 w-[6rem] text-center">LM</th>
      </tr>
    </thead>
    <tbody className="align-top">
      {filtered.map((r) => (
        <tr key={r.id} className={`border-t hover:bg-slate-100/60 ${statusRowClass(r.statut)}`}>
          {/* Restaurant */}
          <td
            className="px-2 py-2 font-medium whitespace-normal break-words leading-5 max-w-[12rem]"
            title={r.restaurant}
          >
            {r.restaurant}
          </td>

          {/* Adresse */}
          <td
            className="px-2 py-2 whitespace-normal break-words leading-5 max-w-[18rem]"
            title={r.adresse}
          >
            {r.adresse}
          </td>

          {/* Téléphone */}
          <td className="px-2 py-2 whitespace-nowrap">{r.telephone}</td>

          {/* New / Étoiles / Arr */}
          <td className="px-2 py-2 text-center">{r.nouveau ? "🆕" : ""}</td>
          <td className="px-2 py-2 text-center">{r.etoiles}</td>
          <td className="px-2 py-2 text-center">{r.arr}</td>

          {/* Statut */}
          <td className="px-2 py-2 whitespace-nowrap">
            <select
              className={`w-full min-w-[12rem] rounded-lg border px-2 py-1 ${statusSelectClass(r.statut)}`}
              value={r.statut}
              onChange={(e) => {
                const today = new Date().toISOString().slice(0, 10);
                updateRow(r.id, { statut: e.target.value, derniereMaj: today });
              }}
            >
              <option value="">—</option>
              {store.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </td>

          {/* Dernière MAJ */}
          <td className="px-2 py-2">
            <input
              type="date"
              className="w-full rounded-lg border px-2 py-1"
              value={r.derniereMaj}
              onChange={(e) => updateRow(r.id, { derniereMaj: e.target.value })}
            />
          </td>

          {/* Commentaire (auto-height) */}
          <td className="px-2 py-2 align-top">
            <textarea
              data-autosize
              rows={1}
               className="w-full rounded-lg border px-2 py-1 leading-5 align-top overflow-hidden"
              value={r.commentaire}
              onChange={(e) => {
                const today = new Date().toISOString().slice(0, 10);
                updateRow(r.id, { commentaire: e.target.value, derniereMaj: today });
                autosize(e.currentTarget);
              }}
              onInput={(e) => autosize(e.currentTarget)}
              placeholder="Note rapide (qui a appelé, retour, etc.)"
              style={{ resize: "none", minHeight: "2.25rem" }}
            />
          </td>

          {/* CV / LM */}
          <td className="px-2 py-2 text-center">
            <input
              type="checkbox"
              className="h-5 w-5 accent-emerald-600"
              checked={r.cvEnvoye}
              onChange={(e) =>
                updateRow(r.id, { cvEnvoye: e.target.checked, derniereMaj: new Date().toISOString().slice(0, 10) })
              }
            />
          </td>
          <td className="px-2 py-2 text-center">
            <input
              type="checkbox"
              className="h-5 w-5 accent-indigo-600"
              checked={r.lmEnvoye}
              onChange={(e) =>
                updateRow(r.id, { lmEnvoye: e.target.checked, derniereMaj: new Date().toISOString().slice(0, 10) })
              }
            />
          </td>
        </tr>
      ))}
      {filtered.length === 0 && (
        <tr>
          <td colSpan={11} className="p-6 text-center text-slate-500">
            Aucun résultat avec ces filtres.
          </td>
        </tr>
      )}
    </tbody>
  </table>
</section>


        <footer className="text-xs text-slate-500">
          <p>
            Réalisé par Papa avec amour
          </p>
        </footer>
      </div>

      {showImport && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border bg-white p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Importer CSV/TSV</h2>
              <button onClick={() => setShowImport(false)} className="rounded-lg border px-2 py-1">
                Fermer
              </button>
            </div>
            <textarea
              className="h-64 w-full rounded-xl border p-3 font-mono text-xs"
              placeholder={`Collez ici vos lignes CSV/TSV avec en-têtes :
Restaurant\tAdresse\tTéléphone\tNouveau\tEtoiles\tArr\tStatut\tDernière MAJ\tCommentaire\tCV envoyé\tLM envoyé`}
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setImportText("")} className="rounded-xl border bg-white px-3 py-2 shadow-sm">
                Vider
              </button>
              <button onClick={onImport} className="rounded-xl border bg-white px-3 py-2 shadow-sm">
                Importer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Helpers */
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((s) => s.trim());
}


async function signIn(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: SITE_URL }
  });
  if (error) alert(error.message);
  else alert("Regarde ta boîte mail (lien magique).");
}

async function signOut() {
  await supabase.auth.signOut();
  location.reload();
}


// autosize pour <textarea>
function autosize(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}


function normalizeDate(input: string): string {
  if (!input) return "";
  const dmy = input.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    const yyyy = dmy[3].length === 2 ? (Number(dmy[3]) + 2000).toString() : dmy[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  const ymd = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return input;
  return "";
}
