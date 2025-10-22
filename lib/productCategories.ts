export type ProductCategory =
  | "baza"
  | "baslik"
  | "yatak"
  | "komodin"
  | "sifonyer"
  | "bench"
  | "puf"
  | "other";

const KEYWORDS: Array<[ProductCategory, string[]]> = [
  ["komodin", ["komodin", "comodin"]],
  ["sifonyer", ["şifonyer", "sifonyer", "sifon", "sif." ]],
  ["bench", ["bench", "bank"]],
  ["puf", ["puf"]],
  ["baza", ["baza"]],
  ["yatak", ["yatak"]],
  ["baslik", ["başlık", "baslik", "başlik", "baslık"]],
];

export function categorizeProductName(name: string | null | undefined): ProductCategory {
  if (!name) return "other";
  const lower = name.toLowerCase();

  for (const [category, keywords] of KEYWORDS) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return category;
    }
  }

  return "other";
}

export function belongsToBaslikDepartment(category: ProductCategory) {
  return ["baslik", "komodin", "sifonyer", "bench", "puf"].includes(category);
}
