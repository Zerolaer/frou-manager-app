import type { FinanceSnapshot } from '@/features/finance/ai/types'

const MONTHS_RU = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function roundEur(n: number): string {
  return Math.round(n).toLocaleString('ru-RU')
}

function monthLine(
  totals: number[],
  months: string[],
  label: string
): string {
  const parts = totals.map((v, i) => `${months[i]}: €${roundEur(v)}`).join(' | ')
  return `${label}: ${parts}`
}

function formatTemporalBlock(snapshot: FinanceSnapshot): string {
  const t = snapshot.temporal
  const s = snapshot.summary
  const refIdx = t.reference_month_index

  const lines = [
    '--- КАЛЕНДАРЬ И «ТЕКУЩИЙ МЕСЯЦ» ---',
    `Сегодня: ${t.today_iso}`,
    `Календарный месяц сейчас: ${t.calendar_month_name_ru} (${t.calendar_month_number}-й месяц года)`,
    `Год в сетке на экране: ${t.grid_year}`,
  ]

  if (t.is_grid_current_year && refIdx >= 0) {
    lines.push(
      `«ТЕКУЩИЙ МЕСЯЦ» для анализа = ${t.reference_month_name_ru} ${t.grid_year} (месяц №${t.reference_month_number})`,
      `Доход за ${t.reference_month_name_ru}: €${roundEur(s.income_by_month[refIdx] ?? 0)}`,
      `Расход за ${t.reference_month_name_ru}: €${roundEur(s.expense_by_month[refIdx] ?? 0)}`,
      `Баланс за ${t.reference_month_name_ru}: €${roundEur(s.balance_by_month[refIdx] ?? 0)}`,
    )
  } else {
    lines.push(
      `ВНИМАНИЕ: сетка за ${t.grid_year}, а сейчас ${t.calendar_year} год. «Текущий месяц» = ${t.calendar_month_name_ru} ${t.calendar_year}, но в этой сетке такого периода нет — уточни у пользователя.`,
    )
  }

  lines.push(
    `НЕ ПУТАТЬ с «лучшим месяцем»: макс. доход был в ${t.best_income_month_name_ru}, макс. расход в ${t.best_expense_month_name_ru} — это НЕ «текущий месяц».`,
  )

  return lines.join('\n')
}

export const FINANCE_ENTRY_INCLUSION_RULES = `--- ЗАПИСИ В ЯЧЕЙКАХ (ЧЕКБОКС) ---
Каждая листовая ячейка может содержать несколько записей (entries).
- included=true, чекбокс ВКЛЮЧЁН = запись ОТКРЫТА → входит в итог ячейки и все сводные суммы.
- included=false, чекбокс СНЯТ = запись ЗАКРЫТА → НЕ входит в итог ячейки и сводные суммы.
- Итог ячейки (total_eur) и все месячные/годовые итоги уже посчитаны ТОЛЬКО по открытым записям.
- Закрытые записи показаны для справки — их суммы НЕЛЬЗЯ добавлять к открытым или к итогам.`

function formatActiveEntry(amountEur: number, note: string | null): string {
  const notePart = note ? ` «${note}»` : ''
  return `[открыто ✓] €${roundEur(amountEur)}${notePart}`
}

function formatClosedEntry(amountEur: number, note: string | null): string {
  const notePart = note ? ` «${note}»` : ''
  return `[закрыто ✗] €${roundEur(amountEur)}${notePart}`
}

function formatCategoryBlock(
  categories: FinanceSnapshot['categories']['income'],
  sectionTitle: string,
  months: string[]
): string {
  if (categories.length === 0) {
    return `${sectionTitle}\n(нет категорий)\n`
  }

  const lines: string[] = [sectionTitle]
  for (const cat of categories) {
    const indent = cat.parent_id ? '  └ ' : '• '
    const role = cat.is_leaf ? '' : ' [сумма подкатегорий]'
    const annual = cat.monthly_totals_eur.reduce((s, v) => s + v, 0)
    lines.push(`${indent}${cat.name}${role} — год: €${roundEur(annual)}`)
    lines.push(`    ${monthLine(cat.monthly_totals_eur, months, 'по месяцам')}`)

    if (cat.cells?.length) {
      for (const cell of cat.cells) {
        const m = months[cell.month - 1] ?? String(cell.month)
        if (cell.entries.length === 0) continue
        const active = cell.entries.filter((e) => e.included)
        const closed = cell.entries.filter((e) => !e.included)
        lines.push(`    ${m} — итого €${roundEur(cell.total_eur)} (только открытые):`)
        if (active.length > 0) {
          lines.push(`      открытые: ${active.map((e) => formatActiveEntry(e.amount_eur, e.note)).join(' + ')}`)
        }
        if (closed.length > 0) {
          lines.push(
            `      закрытые (не учитывать): ${closed.map((e) => formatClosedEntry(e.amount_eur, e.note)).join(', ')}`
          )
        }
      }
    }
  }
  return lines.join('\n')
}

/** Human-readable grid — primary context for the model (all categories × 12 months). */
export function buildFinanceAITextContext(snapshot: FinanceSnapshot, locale = 'ru'): string {
  const months = locale.startsWith('ru') ? MONTHS_RU : MONTHS_EN
  const s = snapshot.summary

  return [
    `=== ФИНАНСОВАЯ СЕТКА ${snapshot.year} ===`,
    `Валюта отображения: EUR`,
    '',
    FINANCE_ENTRY_INCLUSION_RULES,
    '',
    formatTemporalBlock(snapshot),
    '',
    '--- ИТОГИ ПО МЕСЯЦАМ ---',
    monthLine(s.income_by_month, months, 'Доход'),
    monthLine(s.expense_by_month, months, 'Расход'),
    monthLine(s.balance_by_month, months, 'Баланс'),
    '',
    `Год: доход €${roundEur(s.annual.total_income)}, расход €${roundEur(s.annual.total_expense)}, баланс €${roundEur(s.annual.balance)}, сбережения ${s.annual.savings_rate_percent.toFixed(1)}%`,
    '',
    formatCategoryBlock(snapshot.categories.income, '--- ДОХОДЫ (все категории и все месяцы) ---', months),
    '',
    formatCategoryBlock(snapshot.categories.expense, '--- РАСХОДЫ (все категории и все месяцы) ---', months),
    '',
    formatLeafCatalog(snapshot, locale),
  ].join('\n')
}

function formatLeafCatalog(snapshot: FinanceSnapshot, locale = 'ru'): string {
  const months = locale.startsWith('ru') ? MONTHS_RU : MONTHS_EN
  const lines = ['--- ЛИСТОВЫЕ КАТЕГОРИИ (для точного id) ---']
  for (const type of ['income', 'expense'] as const) {
    const cats = snapshot.categories[type].filter((c) => c.is_leaf)
    if (!cats.length) continue
    lines.push(type === 'income' ? 'доходы:' : 'расходы:')
    for (const cat of cats) {
      const monthBits = cat.monthly_totals_eur
        .map((v, i) => `${months[i]}:€${roundEur(v)}`)
        .join(' ')
      lines.push(`- ${cat.name} | id:${cat.id} | ${monthBits}`)
    }
  }
  return lines.join('\n')
}

export type FinanceAIPromptOptions = {
  allowWrites?: boolean
  activeMonthIndex?: number
}

const WRITE_RULES = `РЕЖИМ АССИСТЕНТА (МОЖНО МЕНЯТЬ ДАННЫЕ):
Ответ СТРОГО одним JSON-объектом, без markdown и без текста вокруг:
{
  "reply": "короткий ответ пользователю на русском",
  "actions": []
}

actions — массив операций. Допустимые op:
1) set_balance — выставить ИТОГ листовой ячейки. Поля: category_id (предпочтительно), category_name, type ("income"|"expense"), month (1-12), new_total (число), currency (EUR по умолчанию), note.
   Система сама добавит корректирующую запись, чтобы итог стал new_total.
2) add_entry — добавить запись в листовую ячейку. Поля: category_id, category_name, type, month, amount (может быть отрицательным), currency, note.

ПРАВИЛА СПИСАНИЯ (КРИТИЧНО):
- «Потратил X из Swedbank / со счёта / с карты» БЕЗ явной просьбы записать в расходы → ТОЛЬКО изменение этой ячейки.
  Если было €600, потратил €300 → set_balance new_total=300 (или одна add_entry amount=-300). НЕ создавать расход.
- Расход создаётся ТОЛЬКО если пользователь ЯВНО просит: «запиши в расходы», «в дополнительные», «купил … запиши трату».
  Тогда: add_entry в подходящую expense-категорию (amount положительный, note = что купили)
  И если указан источник (Swedbank) — дополнительно set_balance/списание с этой income-ячейки.
- Нельзя писать в родительские категории (is_leaf: false).
- Нельзя создавать категории. Если категория не найдена или неоднозначна — actions: [] и спроси в reply.
- Не делай сразу set_balance и add_entry на одну и ту же ячейку.
- Если месяц не назван — используй месяц на экране пользователя.
- amount/new_total всегда в указанной валюте, по умолчанию EUR.`

export function buildFinanceAISystemPrompt(
  snapshot: FinanceSnapshot,
  options: FinanceAIPromptOptions = {}
): string {
  const textContext = buildFinanceAITextContext(snapshot, 'ru')
  const activeMonthIndex =
    typeof options.activeMonthIndex === 'number' && options.activeMonthIndex >= 0 && options.activeMonthIndex <= 11
      ? options.activeMonthIndex
      : snapshot.temporal.reference_month_index >= 0
        ? snapshot.temporal.reference_month_index
        : snapshot.temporal.calendar_month_index
  const activeMonthName = MONTHS_RU[activeMonthIndex] ?? String(activeMonthIndex + 1)

  if (options.allowWrites) {
    return `Ты — финансовый ассистент Frou Manager. Режим: ЗАПИСЬ ДАННЫХ (assistant).

ЯЗЫК (КРИТИЧНО):
- Поле reply — ИСКЛЮЧИТЕЛЬНО на русском языке.

МЕСЯЦ НА ЭКРАНЕ: ${activeMonthName} ${snapshot.year} (месяц №${activeMonthIndex + 1}). Если пользователь не назвал месяц, пиши в него.

${WRITE_RULES}

ДАННЫЕ СЕТКИ:
${textContext}`
  }

  return `Ты — финансовый ассистент Frou Manager. Режим: ТОЛЬКО АНАЛИЗ (read-only).

ЯЗЫК (КРИТИЧНО):
- Отвечай ИСКЛЮЧИТЕЛЬНО на русском языке.
- Запрещено отвечать на английском, даже частично.
- Все заголовки, списки и цифры сопровождай русским текстом.

ДАННЫЕ:
- Полная сетка: ВСЕ категории доходов и расходов, ВСЕ 12 месяцев.
- «Текущий месяц» = только месяц из блока КАЛЕНДАРЬ (reference_month), НЕ лучший месяц по расходам/доходам.
- Родительские категории [сумма подкатегорий] — агрегат детей.

ЗАПИСИ В ЯЧЕЙКАХ (КРИТИЧНО):
- included=true / [открыто ✓] / чекбокс включён → запись УЧИТЫВАЕТСЯ в итогах.
- included=false / [закрыто ✗] / чекбокс снят → запись НЕ УЧИТЫВАЕТСЯ — игнорируй при подсчётах.
- Итоги ячеек и сводные суммы уже без закрытых записей — не добавляй закрытые к открытым.

ДАННЫЕ СЕТКИ:
${textContext}`
}

/** @deprecated use buildFinanceAISystemPrompt(snapshot) — finance AI is Russian-only */
export function buildFinanceAISystemPromptWithLocale(snapshot: FinanceSnapshot, locale = 'ru'): string {
  if (locale.startsWith('ru')) return buildFinanceAISystemPrompt(snapshot)
  return buildFinanceAISystemPrompt(snapshot)
}

export function buildFinanceAICompactJson(snapshot: FinanceSnapshot): string {
  const compact = {
    year: snapshot.year,
    temporal: snapshot.temporal,
    summary: snapshot.summary,
    income: snapshot.categories.income.map((c) => ({
      id: c.id,
      name: c.name,
      parent: c.parent_name,
      is_leaf: c.is_leaf,
      monthly_eur: c.monthly_totals_eur,
    })),
    expense: snapshot.categories.expense.map((c) => ({
      id: c.id,
      name: c.name,
      parent: c.parent_name,
      is_leaf: c.is_leaf,
      monthly_eur: c.monthly_totals_eur,
    })),
  }
  return JSON.stringify(compact)
}
