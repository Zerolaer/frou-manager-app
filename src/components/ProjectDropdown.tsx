import Dropdown from './ui/Dropdown'
import type { Project } from '@/types/shared'

export default function ProjectDropdown({
  value, projects, onChange,
}: {
  value: string
  projects: Array<{id: string, name: string}>
  onChange: (v: string) => void
}){
  const options = [
    { value: '', label: 'Без проекта' },
    ...projects.map(p => ({ value: p.id, label: p.name }))
  ]

  return (
    <Dropdown
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Выберите проект"
      ariaLabel="Выбор проекта"
      className="w-full"
      buttonClassName="w-full justify-between"
    />
  )
}