// Component catalog prices retain their existing USD denomination. POS menu
// prices are MYR and use a separate formatter; these are not currency conversions.
export function formatDesignPrice(cents: number) {
  return `US$ ${(cents / 100).toFixed(2)}`;
}
