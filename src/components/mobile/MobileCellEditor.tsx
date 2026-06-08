import React, { useEffect, useMemo, useRef, useState } from 'react'

import { Check, Plus, Trash2 } from 'lucide-react'

import { useSafeTranslation } from '@/utils/safeTranslation'

import { supabase } from '@/lib/supabaseClient'

import MobileModal, { MOBILE_MODAL_STACKED_PX } from '@/components/ui/MobileModal'

import { ModalButton } from '@/components/ui/ModalSystem'

import { CoreInput } from '@/components/ui/CoreInput'

import Dropdown from '@/components/ui/Dropdown'

import { convertToEUR, initializeExchangeRates } from '@/utils/currency'

import { logger } from '@/lib/monitoring'

import { cn } from '@/lib/utils'



type Entry = {

  id: string

  amount: number

  currency: 'EUR' | 'USD' | 'GEL'

  note: string | null

  included: boolean

  position: number

}



const CURRENCY_OPTIONS = [

  { value: 'EUR', label: 'EUR' },

  { value: 'USD', label: 'USD' },

  { value: 'GEL', label: 'GEL' },

]



/** Flex rows — fixed 44px slots in mobile-shell.css (.mobile-cell-entry-row) */

const ENTRY_ROW = 'mobile-cell-entry-row'

const ADD_ROW = 'mobile-cell-entry-row mobile-cell-entry-row--add'

const ENTRY_CONTROL_AMOUNT = 'mobile-cell-entry-control mobile-cell-entry-control--amount'

const ENTRY_CONTROL_CURRENCY = 'mobile-cell-entry-control mobile-cell-entry-control--currency'

const ENTRY_CONTROL_ICON = 'mobile-cell-entry-control mobile-cell-entry-control--icon'

/** Uniform 44px touch target — box-border keeps border inside height */

const TOUCH_SIZE = 'box-border h-11 min-h-11 max-h-11'

const ENTRY_AMOUNT_INPUT = cn(

  'mobile-cell-entry-input',

  'min-w-0 rounded-xl border border-gray-200 bg-white px-3 text-base tabular-nums outline-none'

)

const DESC_FIELD_CLASS = cn(

  TOUCH_SIZE,

  'w-full min-w-0 !px-3 !py-0 text-base !leading-none rounded-xl border-gray-200'

)

const CURRENCY_DROPDOWN_CLASS = 'mobile-cell-entry-currency h-full w-full min-w-0'

const CURRENCY_BTN = cn(

  'mobile-cell-entry-currency-btn',

  'w-full min-w-0 !px-2 !py-0 !text-sm !leading-none font-medium tabular-nums'

)

const CURRENCY_DROPDOWN_PROPS = {

  buttonClassName: CURRENCY_BTN,

  dropdownClassName: 'currency-dropdown',

  menuWidth: 'trigger' as const,

  renderInPortal: true as const,

}



const ICON_BTN = cn(

  'finance-mobile-entry-btn',

  'rounded-xl border border-gray-200 bg-white transition-colors active:bg-gray-50'

)



type Props = {

  open: boolean

  onClose: () => void

  userId: string

  categoryId: string

  categoryName: string

  monthIndex: number

  year: number

  onApply: (sum: number, hasEntriesInCell: boolean) => void

  readOnly?: boolean

  aggregatedTotal?: number

  isParentCategory?: boolean

  canAddSubcategory?: boolean

  onAddSubcategory?: () => void

}



function InclusionToggle({

  included,

  onToggle,

  label,

  className,

}: {

  included: boolean

  onToggle: () => void

  label: string

  className?: string

}) {

  return (

    <button

      type="button"

      onClick={onToggle}

      className={cn(

        ICON_BTN,

        'h-full w-full',

        included

          ? 'border-gray-900 bg-gray-900 text-white'

          : 'border-gray-300 text-transparent',

        className

      )}

      aria-label={label}

      aria-pressed={included}

    >

      {included && <Check className="h-4 w-4 shrink-0" strokeWidth={3} />}

    </button>

  )

}



export default function MobileCellEditor({

  open,

  onClose,

  userId,

  categoryId,

  categoryName,

  monthIndex,

  year,

  onApply,

  readOnly = false,

  aggregatedTotal = 0,

  isParentCategory = false,

  canAddSubcategory = false,

  onAddSubcategory,

}: Props) {

  const { t } = useSafeTranslation()

  const [loading, setLoading] = useState(true)

  const [items, setItems] = useState<Entry[]>([])

  const [amount, setAmount] = useState('')

  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'GEL'>('EUR')

  const [note, setNote] = useState('')

  const [adding, setAdding] = useState(false)

  const amountInputRef = useRef<HTMLInputElement>(null)



  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const debounce = (key: string, fn: () => void, ms = 350) => {

    clearTimeout(timers.current[key])

    timers.current[key] = setTimeout(fn, ms)

  }



  const monthNames = useMemo(

    () => [

      t('finance.months.jan'),

      t('finance.months.feb'),

      t('finance.months.mar'),

      t('finance.months.apr'),

      t('finance.months.may'),

      t('finance.months.jun'),

      t('finance.months.jul'),

      t('finance.months.aug'),

      t('finance.months.sep'),

      t('finance.months.oct'),

      t('finance.months.nov'),

      t('finance.months.dec'),

    ],

    [t]

  )



  const fmt = useMemo(

    () => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),

    []

  )



  function sumIncluded(list: Entry[]) {

    return list.reduce((s, e) => {

      if (!e.included) return s

      return s + convertToEUR(e.amount, e.currency)

    }, 0)

  }



  useEffect(() => {

    if (!open) return

    if (readOnly) {

      setLoading(false)

      setItems([])

      return

    }

    ;(async () => {

      setLoading(true)

      await initializeExchangeRates()

      const { data, error } = await supabase

        .from('finance_entries')

        .select('id, amount, currency, note, included, position, created_at')

        .eq('category_id', categoryId)

        .eq('year', year)

        .eq('month', monthIndex + 1)

        .order('position', { ascending: true })

        .order('created_at', { ascending: true })



      if (error) {

        logger.error('Failed to load entries:', error)

        setLoading(false)

        return

      }



      const list = (data || []).map((d: Record<string, unknown>) => ({

        id: d.id as string,

        amount: Number(d.amount) || 0,

        currency: (d.currency || 'EUR') as 'EUR' | 'USD' | 'GEL',

        note: d.note as string | null,

        included: !!d.included,

        position: (d.position as number) ?? 0,

      }))

      setItems(list)

      setLoading(false)

    })()

  }, [open, categoryId, monthIndex, year, readOnly])



  useEffect(() => {

    if (open) {

      setAmount('')

      setNote('')

      setCurrency('EUR')

      setTimeout(() => amountInputRef.current?.focus(), 100)

    }

  }, [open])



  function updateItemLocal(id: string, patch: Partial<Entry>) {

    setItems((prev) => {

      const next = prev.map((i) => (i.id === id ? { ...i, ...patch } : i))

      onApply(sumIncluded(next), next.length > 0)

      return next

    })

  }



  async function addItem() {

    const value = Number(String(amount).replace(',', '.'))

    if (!userId || isNaN(value) || value === 0) return



    setAdding(true)

    try {

      const insert = {

        user_id: userId,

        category_id: categoryId,

        year,

        month: monthIndex + 1,

        amount: value,

        currency,

        note: note.trim() || null,

        included: true,

        position: items.length,

      }

      const { data, error } = await supabase

        .from('finance_entries')

        .insert(insert)

        .select('id, amount, currency, note, included, position')

        .single()



      if (error) {

        logger.error('Failed to add entry:', error)

        return

      }



      const next: Entry[] = [

        ...items,

        {

          id: data.id,

          amount: Number(data.amount) || 0,

          currency: data.currency || 'EUR',

          note: data.note,

          included: !!data.included,

          position: data.position ?? items.length,

        },

      ]

      setItems(next)

      setAmount('')

      setNote('')

      setCurrency('EUR')

      onApply(sumIncluded(next), next.length > 0)

      setTimeout(() => amountInputRef.current?.focus(), 50)

    } finally {

      setAdding(false)

    }

  }



  function handleKeyPress(e: React.KeyboardEvent) {

    if (e.key === 'Enter') {

      e.preventDefault()

      addItem()

    }

  }



  function changeAmount(id: string, value: string) {

    const num = Number(String(value).replace(',', '.'))

    updateItemLocal(id, { amount: isNaN(num) ? 0 : num })

    debounce('amt:' + id, async () => {

      const { error } = await supabase

        .from('finance_entries')

        .update({ amount: isNaN(num) ? 0 : num })

        .eq('id', id)

      if (error) logger.error('Failed to update entry:', error)

    })

  }



  function changeNote(id: string, value: string) {

    updateItemLocal(id, { note: value })

    debounce('note:' + id, async () => {

      const { error } = await supabase.from('finance_entries').update({ note: value }).eq('id', id)

      if (error) logger.error('Failed to update entry:', error)

    })

  }



  function changeCurrency(id: string, value: 'EUR' | 'USD' | 'GEL') {

    updateItemLocal(id, { currency: value })

    debounce('currency:' + id, async () => {

      const { error } = await supabase.from('finance_entries').update({ currency: value }).eq('id', id)

      if (error) logger.error('Failed to update entry:', error)

    })

  }



  async function toggleIncluded(id: string, checked: boolean) {

    updateItemLocal(id, { included: checked })

    const { error } = await supabase.from('finance_entries').update({ included: checked }).eq('id', id)

    if (error) logger.error('Failed to toggle entry inclusion:', error)

  }



  async function removeItem(id: string) {

    const { error } = await supabase.from('finance_entries').delete().eq('id', id)

    if (error) {

      logger.error('Failed to delete entry:', error)

      return

    }

    const next = items.filter((i) => i.id !== id)

    next.forEach((it, idx) => {

      it.position = idx

    })

    setItems(next)

    onApply(sumIncluded(next), next.length > 0)

    await Promise.all(

      next.map((it, idx) => supabase.from('finance_entries').update({ position: idx }).eq('id', it.id))

    )

  }



  const total = readOnly ? aggregatedTotal : sumIncluded(items)



  const subcategorySection = isParentCategory && (canAddSubcategory || readOnly) && (

    <section className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/80 p-3">

      {canAddSubcategory && onAddSubcategory ? (

        <ModalButton

          variant="secondary"

          onClick={onAddSubcategory}

          className="!flex !h-11 !min-h-11 w-full !flex-row items-center justify-center"

        >

          <span className="inline-flex items-center justify-center gap-2">

            <Plus className="h-4 w-4 shrink-0" />

            {t('finance.addSubcategory')}

          </span>

        </ModalButton>

      ) : (

        <p className="text-xs leading-relaxed text-gray-500">

          {t('finance.cannotAddSubcategory')}

        </p>

      )}

    </section>

  )



  return (

    <MobileModal

      open={open}

      onClose={onClose}

      headerVariant="stacked"

      title={categoryName}

      subtitle={`${monthNames[monthIndex]} ${year}`}

      footer={

        <div className={cn('flex items-center gap-2 py-3', MOBILE_MODAL_STACKED_PX)}>

          <div

            className={cn(

              TOUCH_SIZE,

              'flex min-w-0 flex-1 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3'

            )}

          >

            <div className="flex w-full min-w-0 flex-row items-center justify-between gap-3">

              <span className="inline-flex shrink-0 items-center whitespace-nowrap text-xs font-medium uppercase tracking-wide leading-none text-gray-500">

                {t('finance.total')}

              </span>

              <span className="inline-flex min-w-[6.75rem] shrink-0 items-center justify-end whitespace-nowrap text-base font-semibold leading-none tabular-nums text-gray-900">

                {fmt.format(total)}

              </span>

            </div>

          </div>

          <ModalButton

            variant="secondary"

            onClick={onClose}

            className={cn(TOUCH_SIZE, 'shrink-0 px-5')}

          >

            {t('actions.close')}

          </ModalButton>

        </div>

      }

    >

      <div className={cn('space-y-3 pb-5', MOBILE_MODAL_STACKED_PX)}>

        {loading ? (

          <div className="flex items-center justify-center py-10 text-sm text-gray-500">

            {t('common.loading')}

          </div>

        ) : readOnly ? (

          <>

            <section className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/80 p-3">

              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">

                {t('finance.aggregatedTotal')}

              </h3>

              <p className="text-2xl font-semibold tabular-nums text-gray-900">

                {fmt.format(aggregatedTotal)}

              </p>

              <p className="text-xs leading-relaxed text-gray-500">

                {t('finance.aggregatedTotalHint')}

              </p>

            </section>

            {subcategorySection}

          </>

        ) : (

          <>

            <section className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/80 p-3">

              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">

                {t('finance.addEntry')}

              </h3>



              <div className={ADD_ROW}>

                <div className={ENTRY_CONTROL_AMOUNT}>

                  <input

                    ref={amountInputRef}

                    type="number"

                    inputMode="decimal"

                    placeholder={t('finance.amount')}

                    value={amount}

                    onChange={(e) => setAmount(e.target.value)}

                    onKeyDown={handleKeyPress}

                    className={ENTRY_AMOUNT_INPUT}

                  />

                </div>

                <div className={ENTRY_CONTROL_CURRENCY}>

                  <Dropdown

                    value={currency}

                    onChange={(value) => setCurrency(value as 'EUR' | 'USD' | 'GEL')}

                    options={CURRENCY_OPTIONS}

                    className={CURRENCY_DROPDOWN_CLASS}

                    {...CURRENCY_DROPDOWN_PROPS}

                    aria-label={t('finance.selectCurrency')}

                  />

                </div>

              </div>



              <CoreInput

                placeholder={t('finance.descriptionOptional')}

                value={note}

                onChange={(e) => setNote(e.target.value)}

                onKeyDown={handleKeyPress}

                className={DESC_FIELD_CLASS}

              />



              <ModalButton

                variant="primary"

                onClick={addItem}

                disabled={adding || !amount}

                loading={adding}

                className="!flex !h-11 !min-h-11 w-full !flex-row items-center justify-center"

              >

                <span className="inline-flex items-center justify-center gap-2">

                  <Plus className="h-4 w-4 shrink-0" />

                  {t('finance.addEntry')}

                </span>

              </ModalButton>

            </section>



            {items.length === 0 ? (

              <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500">

                {t('finance.noEntries')}

              </div>

            ) : (

              <section className="space-y-2">

                {items.map((item) => (

                  <article

                    key={item.id}

                    className={cn(

                      'space-y-2 rounded-xl border p-3 transition-opacity',

                      item.included

                        ? 'border-gray-200 bg-white'

                        : 'border-gray-100 bg-gray-50 opacity-60'

                    )}

                  >

                    <div className={ENTRY_ROW}>

                      <div className={ENTRY_CONTROL_ICON}>

                        <InclusionToggle

                          included={item.included}

                          onToggle={() => toggleIncluded(item.id, !item.included)}

                          label={item.included ? t('actions.close') : t('actions.confirm')}

                        />

                      </div>

                      <div className={ENTRY_CONTROL_AMOUNT}>

                        <input

                          type="number"

                          inputMode="decimal"

                          value={String(item.amount)}

                          onChange={(e) => changeAmount(item.id, e.target.value)}

                          className={ENTRY_AMOUNT_INPUT}

                        />

                      </div>

                      <div className={ENTRY_CONTROL_CURRENCY}>

                        <Dropdown

                          value={item.currency}

                          onChange={(value) => changeCurrency(item.id, value as 'EUR' | 'USD' | 'GEL')}

                          options={CURRENCY_OPTIONS}

                          className={CURRENCY_DROPDOWN_CLASS}

                          {...CURRENCY_DROPDOWN_PROPS}

                          aria-label={t('finance.selectCurrency')}

                        />

                      </div>

                      <div className={ENTRY_CONTROL_ICON}>

                        <button

                          type="button"

                          onClick={() => removeItem(item.id)}

                          className={ICON_BTN}

                          aria-label={t('actions.delete')}

                        >

                          <Trash2 className="h-4 w-4 shrink-0 text-gray-600" />

                        </button>

                      </div>

                    </div>

                    <CoreInput

                      placeholder={t('finance.descriptionOptional')}

                      value={item.note || ''}

                      onChange={(e) => changeNote(item.id, e.target.value)}

                      className={DESC_FIELD_CLASS}

                    />

                  </article>

                ))}

              </section>

            )}

            {subcategorySection}

          </>

        )}

      </div>

    </MobileModal>

  )

}


