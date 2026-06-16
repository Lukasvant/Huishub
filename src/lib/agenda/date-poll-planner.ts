import { addMinutes, isBefore } from "date-fns";
import { asDate } from "@/lib/date";
import type { AgendaItem } from "@/types/models";

export interface BusyBlock {
  start: Date;
  end: Date;
}

export interface DatePollPlanningInput {
  rangeStart: Date;
  rangeEnd: Date;
  durationMinutes: number;
  stepMinutes?: number;
  allowedWeekdays?: number[];
  allowedStartHour?: number;
  allowedEndHour?: number;
  maxSuggestions?: number;
  busyBlocks?: BusyBlock[];
  agendaItems?: AgendaItem[];
}

export interface SuggestedDatePollSlot {
  id: string;
  startDateTime: Date;
  endDateTime: Date;
}

function isBeforeOrEqual(left: Date, right: Date) {
  return left.getTime() <= right.getTime();
}

function overlaps(left: BusyBlock, right: BusyBlock) {
  return isBefore(left.start, right.end) && isBefore(right.start, left.end);
}

function slotId(start: Date, end: Date) {
  return `${start.toISOString()}_${end.toISOString()}`;
}

function agendaBusyBlocks(items: AgendaItem[]): BusyBlock[] {
  return items
    .map((item) => {
      const start = asDate(item.startDateTime);
      if (!start) return undefined;
      const end =
        asDate(item.endDateTime) ??
        addMinutes(start, item.allDay ? 24 * 60 : 60);
      return { start, end };
    })
    .filter((block): block is BusyBlock => Boolean(block));
}

function endsNoLaterThanHour(date: Date, hour: number) {
  return (
    date.getUTCHours() + date.getUTCMinutes() / 60 <= hour ||
    date.getTime() === new Date(date).setUTCHours(hour, 0, 0, 0)
  );
}

export function suggestDatePollSlots({
  rangeStart,
  rangeEnd,
  durationMinutes,
  stepMinutes = 30,
  allowedWeekdays,
  allowedStartHour = 18,
  allowedEndHour = 22,
  maxSuggestions = 12,
  busyBlocks = [],
  agendaItems = [],
}: DatePollPlanningInput): SuggestedDatePollSlot[] {
  if (durationMinutes <= 0 || stepMinutes <= 0) return [];
  const allBusyBlocks = [...busyBlocks, ...agendaBusyBlocks(agendaItems)];
  const suggestions: SuggestedDatePollSlot[] = [];
  let cursor = new Date(rangeStart);

  while (
    suggestions.length < maxSuggestions &&
    isBeforeOrEqual(addMinutes(cursor, durationMinutes), rangeEnd)
  ) {
    const end = addMinutes(cursor, durationMinutes);
    const weekdayAllowed =
      !allowedWeekdays || allowedWeekdays.includes(cursor.getUTCDay());
    const withinHours =
      cursor.getUTCHours() >= allowedStartHour &&
      endsNoLaterThanHour(end, allowedEndHour);
    const candidate = { start: cursor, end };
    const free = !allBusyBlocks.some((busyBlock) =>
      overlaps(candidate, busyBlock),
    );

    if (weekdayAllowed && withinHours && free) {
      suggestions.push({
        id: slotId(cursor, end),
        startDateTime: new Date(cursor),
        endDateTime: new Date(end),
      });
    }

    cursor = addMinutes(cursor, stepMinutes);
  }

  return suggestions;
}
