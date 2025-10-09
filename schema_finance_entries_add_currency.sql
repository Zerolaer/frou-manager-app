-- Добавляем поле currency в таблицу finance_entries
ALTER TABLE finance_entries 
ADD COLUMN currency VARCHAR(3) DEFAULT 'EUR';

-- Обновляем существующие записи
UPDATE finance_entries 
SET currency = 'EUR' 
WHERE currency IS NULL;

-- Добавляем ограничение для валидных валют
ALTER TABLE finance_entries 
ADD CONSTRAINT check_currency 
CHECK (currency IN ('EUR', 'USD', 'GEL'));

-- Создаем индекс для быстрого поиска по валюте
CREATE INDEX idx_finance_entries_currency ON finance_entries(currency);
