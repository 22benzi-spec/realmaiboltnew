import dayjs from "dayjs";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getShiftScheduleRangeDateKeys(
  startDateKey: string,
  endDateKey: string,
  blockedDateKeys: Iterable<string>,
  minimumDateKey?: string
) {
  if (
    !DATE_KEY_PATTERN.test(startDateKey)
    || !DATE_KEY_PATTERN.test(endDateKey)
    || startDateKey.slice(0, 7) !== endDateKey.slice(0, 7)
  ) {
    return [];
  }

  const start = dayjs(startDateKey);
  const end = dayjs(endDateKey);
  if (!start.isValid() || !end.isValid()) return [];

  const blocked = new Set(blockedDateKeys);
  const step = start.isAfter(end, "day") ? -1 : 1;
  const dateKeys: string[] = [];
  let current = start;

  while (true) {
    const dateKey = current.format("YYYY-MM-DD");
    if (
      !blocked.has(dateKey)
      && (!minimumDateKey || dateKey >= minimumDateKey)
    ) {
      dateKeys.push(dateKey);
    }
    if (current.isSame(end, "day")) break;
    current = current.add(step, "day");
  }

  return dateKeys;
}
