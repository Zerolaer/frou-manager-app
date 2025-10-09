// Курсы валют к EUR (базовые значения, будут обновляться через API)
const EXCHANGE_RATES = {
  EUR: 1,
  USD: 0.85, // 1 USD = 0.85 EUR (примерно)
  GEL: 0.35  // 1 GEL = 0.35 EUR (примерно)
}

// Кэш для курсов валют
let cachedRates: typeof EXCHANGE_RATES | null = null
let lastFetchDate: string | null = null

// Получение курсов валют с API
export async function fetchExchangeRates(): Promise<typeof EXCHANGE_RATES> {
  const today = new Date().toISOString().split('T')[0]
  
  // Проверяем кэш
  if (cachedRates && lastFetchDate === today) {
    return cachedRates
  }

  try {
    // Используем бесплатный API ExchangeRate-API
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/EUR`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates')
    }

    const data = await response.json()
    
    // Обновляем курсы
    cachedRates = {
      EUR: 1,
      USD: 1 / data.rates.USD, // Конвертируем из EUR к USD к USD к EUR
      GEL: 1 / data.rates.GEL   // Конвертируем из EUR к GEL к GEL к EUR
    }
    
    lastFetchDate = today
    
    // Сохраняем в localStorage
    localStorage.setItem('exchangeRates', JSON.stringify({
      rates: cachedRates,
      date: today
    }))
    
    return cachedRates
  } catch (error) {
    console.error('Error fetching exchange rates:', error)
    
    // Пытаемся загрузить из localStorage
    try {
      const stored = localStorage.getItem('exchangeRates')
      if (stored) {
        const { rates, date } = JSON.parse(stored)
        if (date === today) {
          cachedRates = rates
          lastFetchDate = today
          return rates
        }
      }
    } catch (e) {
      console.error('Error loading cached rates:', e)
    }
    
    // Fallback на базовые курсы
    return EXCHANGE_RATES
  }
}

// Конвертация суммы в EUR
export function convertToEUR(amount: number, fromCurrency: keyof typeof EXCHANGE_RATES): number {
  if (fromCurrency === 'EUR') {
    return amount
  }
  
  const rate = cachedRates?.[fromCurrency] || EXCHANGE_RATES[fromCurrency]
  return amount * rate
}

// Конвертация суммы из EUR в другую валюту
export function convertFromEUR(amount: number, toCurrency: keyof typeof EXCHANGE_RATES): number {
  if (toCurrency === 'EUR') {
    return amount
  }
  
  const rate = cachedRates?.[toCurrency] || EXCHANGE_RATES[toCurrency]
  return amount / rate
}

// Инициализация курсов при загрузке приложения
export async function initializeExchangeRates(): Promise<void> {
  try {
    await fetchExchangeRates()
  } catch (error) {
    console.error('Failed to initialize exchange rates:', error)
  }
}
