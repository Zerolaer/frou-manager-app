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
  ].join('\n')
}

export function buildFinanceAISystemPrompt(snapshot: FinanceSnapshot): string {
  const textContext = buildFinanceAITextContext(snapshot, 'ru')

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
      name: c.name,
      parent: c.parent_name,
      is_leaf: c.is_leaf,
      monthly_eur: c.monthly_totals_eur,
    })),
    expense: snapshot.categories.expense.map((c) => ({
      name: c.name,
      parent: c.parent_name,
      is_leaf: c.is_leaf,
      monthly_eur: c.monthly_totals_eur,
    })),
  }
  return JSON.stringify(compact)
}
