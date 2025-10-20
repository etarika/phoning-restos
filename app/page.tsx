"use client";

import React, { useEffect, useMemo, useState } from "react";

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

export default function Page() {
  const [store, setStore] = useState<Store>(() => loadStore());
  const [q, setQ] = useState("");
  const [fStars, setFStars] = useState<string>("all");
  const [fArr, setFArr] = useState<string>("all");
  const [fStatut, setFStatut] = useState<string>("all");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  useEffect(() => saveStore(store), [store]);

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
    setStore(s => ({
      ...s,
      rows: s.rows.map(r => (r.id === id ? { ...r, ...patch } : r)),
    }));
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
            <h1 className="text-2xl font-bold">Suivi phoning — Restaurants ⭐</h1>
            <p className="text-sm text-slate-600">
              KPIs par statut, filtres (Étoiles/Arr/Statut), édition inline, import/export CSV.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)} className="rounded-xl border bg-white px-3 py-2 shadow-sm hover:bg-slate-50">
              Importer CSV/TSV
            </button>
            <button onClick={exportCSV} className="rounded-xl border bg-white px-3 py-2 shadow-sm hover:bg-slate-50">
              Exporter CSV
            </button>
            <button onClick={resetAll} className="rounded-xl border bg-white px-3 py-2 shadow-sm hover:bg-slate-50">
              Réinitialiser
            </button>
          </div>
        </header>

        {/* KPIs par statut (cliquables pour filtrer) */}
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {store.statuses.map((s) => (
              <button
                key={s}
                onClick={() => setFStatut(prev => (prev === s ? "all" : s))}
                className={`rounded-full border px-3 py-1 text-sm shadow-sm hover:bg-slate-50 ${fStatut === s ? "bg-slate-100" : ""}`}
                title="Cliquer pour filtrer"
              >
                <span className="font-medium">{s}</span>
                <span className="ml-2 inline-block rounded-full border px-2 text-xs">{kpis.get(s) ?? 0}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Filtres */}
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600">Recherche</label>
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Nom / adresse / téléphone"
                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Étoiles</label>
              <select value={fStars} onChange={e => setFStars(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
                {starOptions.map(opt => (
                  <option key={opt} value={opt}>
                    {opt === "all" ? "Toutes" : opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Arrondissement</label>
              <select value={fArr} onChange={e => setFArr(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
                {arrOptions.map(opt => (
                  <option key={opt} value={opt}>
                    {opt === "all" ? "Tous" : opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Statut</label>
              <select value={fStatut} onChange={e => setFStatut(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
                {statutOptions.map(opt => (
                  <option key={opt} value={opt}>
                    {opt === "all" ? "Tous" : opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Tableau principal */}
        <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <table className="w-full table-fixed border-collapse">
            <thead className="bg-slate-100 text-left text-sm">
              <tr>
                <th className="p-3 w-48">Restaurant</th>
                <th className="p-3 w-64">Adresse</th>
                <th className="p-3 w-40">Téléphone</th>
                <th className="p-3 w-16">New</th>
                <th className="p-3 w-14">⭐</th>
                <th className="p-3 w-20">Arr</th>
                <th className="p-3 w-44">Statut</th>
                <th className="p-3 w-40">Dernière MAJ</th>
                <th className="p-3">Commentaire</th>
                <th className="p-3 w-28">CV envoyé</th>
                <th className="p-3 w-28">LM envoyé</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filtered.map(r => (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-medium truncate" title={r.restaurant}>
                    {r.restaurant}
                  </td>
                  <td className="p-3 truncate" title={r.adresse}>
                    {r.adresse}
                  </td>
                  <td className="p-3 whitespace-nowrap">{r.telephone}</td>
                  <td className="p-3 text-center">{r.nouveau ? "🆕" : ""}</td>
                  <td className="p-3 text-center">{r.etoiles}</td>
                  <td className="p-3">{r.arr}</td>
                  <td className="p-3">
                    <select
                      className="w-full rounded-lg border px-2 py-1"
                      value={r.statut}
                      onChange={e => updateRow(r.id, { statut: e.target.value })}
                    >
                      <option value="">—</option>
                      {store.statuses.map(s => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      type="date"
                      className="w-full rounded-lg border px-2 py-1"
                      value={r.derniereMaj}
                      onChange={e => updateRow(r.id, { derniereMaj: e.target.value })}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      className="w-full rounded-lg border px-2 py-1"
                      value={r.commentaire}
                      onChange={e => updateRow(r.id, { commentaire: e.target.value })}
                      placeholder="Note rapide (qui a appelé, retour, etc.)"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={r.cvEnvoye}
                      onChange={e => updateRow(r.id, { cvEnvoye: e.target.checked })}
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={r.lmEnvoye}
                      onChange={e => updateRow(r.id, { lmEnvoye: e.target.checked })}
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
            Import: Restaurant, Adresse, Téléphone, Nouveau, Etoiles, Arr, Statut, Dernière MAJ, Commentaire, CV envoyé, LM envoyé.
            TSV (copier/coller Excel) accepté.
          </p>
          <p>Modifs sauvegardées dans ce navigateur (localStorage). Pour multi-utilisateurs : brancher Supabase.</p>
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
