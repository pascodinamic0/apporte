import fs from "node:fs/promises";

export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  let updates: any[] = [];
  try {
    const raw = await fs.readFile(process.cwd() + "/public/updates.json", "utf8");
    updates = JSON.parse(raw);
  } catch {}
  return (
    <div className="py-2">
      <h1 className="text-xl font-semibold mb-3">Quoi de neuf</h1>
      <div className="grid gap-3">
        {updates.map((u, i) => (
          <div key={i} className="rounded-lg border p-3">
            <div className="text-sm text-gray-600">{u.date}</div>
            <div className="font-medium">{u.title}</div>
            {u.items && (
              <ul className="list-disc pl-5 text-sm text-gray-700">
                {u.items.map((li: string, j: number) => (
                  <li key={j}>{li}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {!updates.length && <div className="text-gray-600">Aucune note de mise à jour.</div>}
      </div>
    </div>
  );
}

