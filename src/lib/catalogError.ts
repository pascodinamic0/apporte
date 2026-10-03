/** Thrown by order creation when the catalogue rejects a line. `message` is the stable code. */
export class CatalogError extends Error {
  names: string[];
  constructor(code: string, names: string[] = []) {
    super(code);
    this.name = "CatalogError";
    this.names = names;
  }
}

export function catalogNames(e: unknown): string[] {
  if (!e || typeof e !== "object" || !("names" in e)) return [];
  const names = (e as { names?: unknown }).names;
  if (!Array.isArray(names)) return [];
  return names.filter((n): n is string => typeof n === "string" && n.trim().length > 0);
}
