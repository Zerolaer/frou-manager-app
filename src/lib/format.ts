export const EUR = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

export function formatCurrencyEUR(value: number | null | undefined) {
  if (value == null || isNaN(Number(value))) return '€0.00';
  return EUR.format(Number(value));
}
