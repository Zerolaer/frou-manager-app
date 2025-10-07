import Dropdown from './ui/Dropdown'

type Props = {
  value: 'income' | 'expense'
  onChange: (v: 'income' | 'expense') => void
  fullWidth?: boolean
}

const TYPE_OPTIONS = [
  { value: 'income', label: 'Доходы' },
  { value: 'expense', label: 'Расходы' },
]

export default function TypeDropdown({ value, onChange, fullWidth }: Props){
  return (
    <Dropdown
      options={TYPE_OPTIONS}
      value={value}
      onChange={(newValue) => onChange(newValue as 'income' | 'expense')}
      placeholder="Тип"
      ariaLabel="Выбор типа"
      className={fullWidth ? 'w-full' : ''}
    />
  )
}
