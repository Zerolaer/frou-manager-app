import Dropdown from './ui/Dropdown'
import { useTranslation } from 'react-i18next'

export default function YearDropdown({
  value, years, onChange,
}: {
  value: number
  years: number[]
  onChange: (v:number)=>void
}){
  const { t } = useTranslation()
  const options = years.map(y => ({ value: y.toString(), label: y.toString() }))

  return (
    <Dropdown
      options={options}
      value={value.toString()}
      onChange={(newValue) => onChange(typeof newValue === 'number' ? newValue : parseInt(String(newValue)))}
      placeholder={t('common.year')}
      aria-label={t('aria.selectYear')}
    />
  )
}
