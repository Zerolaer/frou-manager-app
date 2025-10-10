import Dropdown from './ui/Dropdown'
import { useTranslation } from 'react-i18next'

type Props = {
  value: 'income' | 'expense'
  onChange: (v: 'income' | 'expense') => void
  fullWidth?: boolean
}

export default function TypeDropdown({ value, onChange, fullWidth }: Props){
  const { t } = useTranslation()
  
  const TYPE_OPTIONS = [
    { value: 'income', label: t('finance.income') },
    { value: 'expense', label: t('finance.expense') },
  ]

  return (
    <Dropdown
      options={TYPE_OPTIONS}
      value={value}
      onChange={(newValue) => onChange(String(newValue) as 'income' | 'expense')}
      placeholder={t('finance.type')}
      aria-label={t('aria.selectType')}
      className={fullWidth ? 'w-full' : ''}
    />
  )
}
