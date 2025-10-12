import Dropdown from './ui/Dropdown'
import { useSafeTranslation } from '@/utils/safeTranslation'

export default function YearDropdown({
  value, years, onChange,
}: {
  value: number
  years: number[]
  onChange: (v:number)=>void
}){
  const { t } = useSafeTranslation()
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
