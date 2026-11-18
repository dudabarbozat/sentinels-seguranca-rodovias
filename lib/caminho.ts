/* Caminho de arquivos de public/ respeitando o basePath do GitHub Pages. */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(caminho: string): string {
  return `${BASE}${caminho}`;
}
