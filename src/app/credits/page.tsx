import fs from "node:fs/promises";

export const dynamic = "force-dynamic";

export default async function CreditsPage() {
  const jsonPath = process.cwd() + "/public/images/manifest.json";
  let manifest: any = null;
  try {
    const raw = await fs.readFile(jsonPath, "utf8");
    manifest = JSON.parse(raw);
  } catch {}
  return (
    <div className="py-2 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-3">À propos / Crédits photos</h1>
      {!manifest ? (
        <p className="text-sm text-gray-700">
          Les crédits ne sont pas disponibles dans cet environnement.
        </p>
      ) : (
        <div className="grid gap-3">
          {Object.entries<any>(manifest.items).map(([key, info]) => {
            if (!info.file || !info.source) return null;
            const file = `/images/${info.file}`;
            return (
              <div key={key} className="flex items-center gap-3 rounded-lg border p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file} alt={key} className="h-16 w-24 rounded object-cover" />
                <div className="text-sm">
                  <div className="font-medium">{key}</div>
                  <div className="text-gray-700">
                    Licence:{" "}
                    <a className="text-emerald-700 underline" href={info.source} target="_blank">
                      {info.license || "Source"}
                    </a>
                  </div>
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

