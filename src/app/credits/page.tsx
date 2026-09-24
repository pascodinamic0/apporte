import fs from "node:fs/promises";

export const dynamic = "force-dynamic";

export default async function CreditsPage() {
  const mdPath = process.cwd() + "/public/images/CREDITS.md";
  let md = "";
  try {
    md = await fs.readFile(mdPath, "utf8");
  } catch {}
  const html = md
    .replace(/^# (.*)$/gm, "<h1 class=\"text-2xl font-semibold mb-2\">$1</h1>")
    .replace(/^## (.*)$/gm, "<h2 class=\"text-xl font-semibold mt-4 mb-2\">$1</h2>")
    .replace(/^\- (.*)$/gm, "<li>$1</li>")
    .replace(/\n{2,}/g, "\n\n");
  return (
    <div className="py-2 prose prose-sm max-w-5xl">
      <h1 className="text-2xl font-semibold mb-3">À propos / Crédits photos</h1>
      {md ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-sm text-gray-700">
          Le fichier de crédits n’est pas disponible dans cet environnement.
        </p>
      )}
    </div>
  );
}

