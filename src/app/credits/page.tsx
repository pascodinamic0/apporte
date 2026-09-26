import type { Metadata } from "next";
import fs from "node:fs/promises";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crédits photos" };

function parseCredits(md: string) {
  const rows = md.split("\n").filter((l) => l.trim().startsWith("| `"));
  return rows.map((l) => {
    const cells = l.split("|").map((c) => c.trim());
    const file = cells[1]?.replace(/`/g, "") || "";
    const subject = cells[2] || "";
    const photographer = cells[3] || "";
    const licenseCell = cells[4] || "";
    const source = cells[5] || "";
    const licenseMatch = licenseCell.match(/\((https?:[^)]+)\)/);
    const licenseUrl = licenseMatch ? licenseMatch[1] : "";
    const licenseName = licenseCell.replace(/\s*\(.*\)\s*/g, "");
    return { file, subject, photographer, licenseName, licenseUrl, source };
  });
}

export default async function CreditsPage() {
  const mdPath = process.cwd() + "/public/images/CREDITS.md";
  let credits: any[] = [];
  try {
    const raw = await fs.readFile(mdPath, "utf8");
    credits = parseCredits(raw);
  } catch {}
  return (
    <div className="py-2 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-3">À propos / Crédits photos</h1>
      {!credits.length ? (
        <p className="text-sm text-gray-700">
          Les crédits ne sont pas disponibles dans cet environnement.
        </p>
      ) : (
        <div className="grid gap-3">
          {credits.map((c) => {
            const file = `/images/${c.file}`;
            const isEmpty = c.file.startsWith("empty-");
            return (
              <div key={c.file} className="flex items-center gap-3 rounded-lg border p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file} alt={c.subject || c.file} className="h-16 w-24 rounded object-cover" />
                <div className="text-sm">
                  <div className="font-medium">{c.subject || c.file.replace(/\\.jpg$/,'')}</div>
                  {!isEmpty ? (
                    <div className="text-gray-700">
                      Photographe: <span className="font-medium">{c.photographer || "—"}</span>
                      <br />
                      Licence:{" "}
                      <a className="text-emerald-700 underline" href={c.licenseUrl || c.source} target="_blank">
                        {c.licenseName || "Détails"}
                      </a>{" "}
                      •{" "}
                      <a className="text-emerald-700 underline" href={c.source} target="_blank">
                        Source
                      </a>
                    </div>
                  ) : (
                    <div className="text-gray-700">Illustrations: Apporte</div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="text-xs text-gray-600 mt-2">
            Carte: © OpenStreetMap contributors — ODbL 1.0 (voir la page Crédit).
          </div>
        </div>
      )}
    </div>
  );
}

