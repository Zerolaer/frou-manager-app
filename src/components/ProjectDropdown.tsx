import Dropdown from './ui/Dropdown'
import type { Project } from '@/types/shared'
import { useSafeTranslation } from '@/utils/safeTranslation'

export default function ProjectDropdown({
  value, projects, onChange,
}: {
  value: string
  projects: Array<{id: string, name: string}>
  onChange: (v: string) => void
}){
  const { t } = useSafeTranslation()
  
  const options = [
    { value: '', label: t('projects.noProject') },
    ...projects.map(p => ({ value: p.id, label: p.name }))
  ]

  return (
    <Dropdown
      options={options}
      value={value}
      onChange={(v) => onChange(String(v))}
      placeholder={t('projects.selectProject')}
      aria-label={t('aria.selectProject')}
      className="w-full"
      buttonClassName="w-full justify-between"
    />
  )
}