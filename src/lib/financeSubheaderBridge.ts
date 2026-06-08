/**
 * Single callback slot for Finance page subheader actions (no window events — avoids duplicate listeners / stacked modals).
 */
export type FinanceSubheaderHandler = (action: string) => void

let handler: FinanceSubheaderHandler | null = null

export function registerFinanceSubheaderHandler(next: FinanceSubheaderHandler | null): void {
  handler = next
}

export function dispatchFinanceSubheaderAction(action: string): void {
  handler?.(action)
}
