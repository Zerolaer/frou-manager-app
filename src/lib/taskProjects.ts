import { LEGACY_UNCATEGORIZED_PROJECT_NAMES } from '@/lib/constants'

export function filterVisibleTaskProjects<T extends { name: string }>(
  projects: T[],
  localizedUncategorizedName?: string
): T[] {
  const hidden = new Set<string>(LEGACY_UNCATEGORIZED_PROJECT_NAMES)
  if (localizedUncategorizedName) hidden.add(localizedUncategorizedName)
  return projects.filter((p) => !hidden.has(p.name))
}

export function isLegacyUncategorizedProjectName(name: string): boolean {
  return (LEGACY_UNCATEGORIZED_PROJECT_NAMES as readonly string[]).includes(name)
}

/** Maps project_id to a display label; legacy Uncategorized → noProjectLabel */
export function resolveTaskProjectDisplayName(
  projectId: string | null | undefined,
  projectMap: Record<string, string>,
  noProjectLabel: string
): string {
  if (!projectId) return noProjectLabel
  const name = projectMap[projectId]
  if (!name || isLegacyUncategorizedProjectName(name)) return noProjectLabel
  return name
}
