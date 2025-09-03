export function startOfTodayTZ(tz: string) {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit' });
  const [{value: month},,{value: day},,{value: year}] = fmt.formatToParts(now);
  return new Date(`${year}-${month}-${day}T00:00:00`);
}
export function endOfTodayTZ(tz: string) {
  const s = startOfTodayTZ(tz);
  return new Date(s.getTime() + 24*60*60*1000 - 1);
}
export function monthRangeTZ(tz: string) {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit' });
  const [{value: month},,{value: _day},,{value: year}] = fmt.formatToParts(now);
  const start = new Date(`${year}-${month}-01T00:00:00`);
  const end = new Date(new Date(start).setMonth(start.getMonth() + 1) - 1);
  return { start, end };
}
