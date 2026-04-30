/**
 * Single callback slot for Tasks page subheader actions (no window events — avoids duplicate listeners / stacked handlers).
 */
export type TasksSubheaderHandler = (action: string) => void

let handler: TasksSubheaderHandler | null = null

export function registerTasksSubheaderHandler(next: TasksSubheaderHandler | null): void {
  handler = next
}

export function dispatchTasksSubheaderAction(action: string): void {
  handler?.(action)
}
