/** Scheduled time stored as HH:mm (24-hour). */

export function isValidScheduledTime(value: string | null | undefined): value is string {
  if (!value) return false
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function formatScheduledTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function parseScheduledTime(value: string | null | undefined): { hours: number; minutes: number } {
  if (!isValidScheduledTime(value)) {
    const now = new Date()
    return { hours: now.getHours(), minutes: now.getMinutes() }
  }
  const [h, m] = value.split(':').map(Number)
  return { hours: h, minutes: m }
}

export function formatTagWithTime(
  tag: string | null | undefined,
  scheduledTime: string | null | undefined
): string | null {
  const parts: string[] = []
  if (isValidScheduledTime(scheduledTime)) parts.push(scheduledTime)
  if (tag?.trim()) parts.push(tag.trim())
  return parts.length > 0 ? parts.join(' · ') : null
}

export function hasTagOrTime(
  tag: string | null | undefined,
  scheduledTime: string | null | undefined
): boolean {
  return Boolean(tag?.trim()) || isValidScheduledTime(scheduledTime)
}
