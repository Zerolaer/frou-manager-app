export const EUR = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
export const USD = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
export const GEL = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'GEL', maximumFractionDigits: 2 });
export const RUB = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 });

export function formatCurrencyEUR(value: number | null | undefined) {
  if (value == null || isNaN(Number(value))) return '€0.00';
  return EUR.format(Number(value));
}

export function formatCurrency(value: number | null | undefined, currency: 'EUR' | 'USD' | 'GEL' | 'RUB' = 'EUR') {
  if (value == null || isNaN(Number(value))) {
    switch (currency) {
      case 'USD': return '$0.00';
      case 'GEL': return '₾0.00';
      case 'RUB': return '₽0.00';
      default: return '€0.00';
    }
  }
  
  switch (currency) {
    case 'USD': return USD.format(Number(value));
    case 'GEL': return GEL.format(Number(value));
    case 'RUB': return RUB.format(Number(value));
    default: return EUR.format(Number(value));
  }
}
