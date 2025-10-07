import Dropdown from './ui/Dropdown'

export default function YearDropdown({
  value, years, onChange,
}: {
  value: number
  years: number[]
  onChange: (v:number)=>void
}){
  const options = years.map(y => ({ value: y.toString(), label: y.toString() }))

  return (
    <Dropdown
      options={options}
      value={value.toString()}
      onChange={(newValue) => onChange(parseInt(newValue))}
      placeholder="Год"
      ariaLabel="Выбор года"
    />
  )
}
