import {
  WanWangEvent,
  Participant,
  TimeSlot,
  SlotHeatmapInfo,
  BestTimeMatch,
  EVENT_CATEGORIES,
  TimeGranularity,
  DayPartId,
  DAY_PARTS,
} from '@/types';
import { Language } from './i18n';

export const THAI_SHORT_WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
export const EN_SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const THAI_SHORT_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const EN_SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function generateDatesInRange(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate) return [];
  const dates: string[] = [];
  const [y1, m1, d1] = startDate.split('-').map(Number);
  const [y2, m2, d2] = endDate.split('-').map(Number);
  const current = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);

  while (current <= end) {
    dates.push(formatDateToISO(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// Localized Date Formatter using native Intl.DateTimeFormat
export function formatLocalizedDate(
  dateString: string,
  lang: Language = 'th',
  formatType: 'monthYear' | 'chip' | 'weekday' | 'full' = 'chip'
): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  if (lang === 'th') {
    if (formatType === 'monthYear') {
      return new Intl.DateTimeFormat('th-TH', {
        month: 'long',
        year: 'numeric',
        calendar: 'buddhist',
      }).format(dateObj);
    }
    if (formatType === 'chip') {
      const dayShort = THAI_SHORT_WEEKDAYS[dateObj.getDay()];
      const dayNum = dateObj.getDate();
      const monthShort = THAI_SHORT_MONTHS[dateObj.getMonth()];
      return `${dayShort} ${dayNum} ${monthShort}`;
    }
    if (formatType === 'weekday') {
      const dayShort = THAI_SHORT_WEEKDAYS[dateObj.getDay()];
      const dayNum = dateObj.getDate();
      const monthShort = THAI_SHORT_MONTHS[dateObj.getMonth()];
      const yearShort = (year + 543) % 100;
      return `${dayShort} ${dayNum} ${monthShort} ${yearShort}`;
    }
    // full
    const weekdayFull = new Intl.DateTimeFormat('th-TH', { weekday: 'long' }).format(dateObj);
    const monthFull = new Intl.DateTimeFormat('th-TH', { month: 'long' }).format(dateObj);
    return `${weekdayFull}ที่ ${day} ${monthFull} ${year + 543}`;
  }

  // English formatting (CE / Gregorian)
  if (formatType === 'monthYear') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(dateObj);
  }
  if (formatType === 'chip') {
    const weekday = EN_SHORT_WEEKDAYS[dateObj.getDay()];
    const dayNum = dateObj.getDate();
    const monthShort = EN_SHORT_MONTHS[dateObj.getMonth()];
    return `${weekday}, ${dayNum} ${monthShort}`;
  }
  if (formatType === 'weekday') {
    const weekday = EN_SHORT_WEEKDAYS[dateObj.getDay()];
    const dayNum = dateObj.getDate();
    const monthShort = EN_SHORT_MONTHS[dateObj.getMonth()];
    return `${weekday}, ${dayNum} ${monthShort} ${year}`;
  }
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(dateObj);
}

// Localized Time Formatter
export function formatLocalizedTime(timeStr: string, lang: Language = 'th'): string {
  if (!timeStr) return '';
  if (lang === 'th') {
    return `${timeStr} น.`;
  }
  return timeStr;
}

// Sunday is always index 0 for both languages
export function getWeekdayHeaders(lang: Language = 'th'): string[] {
  if (lang === 'th') {
    return [...THAI_SHORT_WEEKDAYS];
  }
  return [...EN_SHORT_WEEKDAYS];
}

export function isWeekend(dateString: string): boolean {
  const [year, month, day] = dateString.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function generateDayTimeSlots(startTime: string, endTime: string, intervalMinutes: number = 60): string[] {
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  const times: string[] = [];

  for (let m = startMins; m < endMins; m += intervalMinutes) {
    times.push(minutesToTime(m));
  }

  return times;
}

export function countEventSlots(
  granularity: TimeGranularity,
  days: number,
  startTime: string,
  endTime: string,
  slotInterval: number
): number {
  if (granularity === 'day') return days;
  if (granularity === 'daypart') return days * 4;
  return days * generateDayTimeSlots(startTime, endTime, slotInterval).length;
}

export function generateAllEventSlots(event: WanWangEvent): TimeSlot[] {
  const granularity = event.granularity || 'hour';

  if (granularity === 'day') {
    return event.dates.map(date => ({
      id: date,
      date,
      time: 'all-day',
    }));
  }

  if (granularity === 'daypart') {
    const slots: TimeSlot[] = [];
    const parts: DayPartId[] = ['morning', 'afternoon', 'evening', 'night'];
    for (const date of event.dates) {
      for (const part of parts) {
        slots.push({
          id: `${date}T${part}`,
          date,
          time: part,
        });
      }
    }
    return slots;
  }

  const times = generateDayTimeSlots(event.startTime || '09:00', event.endTime || '22:00', event.slotInterval || 60);
  const slots: TimeSlot[] = [];

  for (const date of event.dates) {
    for (const time of times) {
      slots.push({
        id: `${date}T${time}`,
        date,
        time,
      });
    }
  }

  return slots;
}

/**
 * Availability is checked once per slot per participant. A year-long event has
 * thousands of slots, and scanning an array for each check froze the page.
 */
function availabilitySets(participants: Participant[]): Map<Participant, Set<string>> {
  return new Map(participants.map(p => [p, new Set(p.availability || p.availableDates || [])]));
}

export function computeHeatmap(
  slots: TimeSlot[],
  participants: Participant[],
  granularity: TimeGranularity = 'hour'
): Record<string, SlotHeatmapInfo> {
  const total = participants.length;
  const result: Record<string, SlotHeatmapInfo> = {};
  const sets = availabilitySets(participants);

  for (const slot of slots) {
    const availableNames: string[] = [];
    const unavailableNames: string[] = [];

    for (const p of participants) {
      const pSlots = sets.get(p)!;
      const isAvailable = (granularity === 'day')
        ? (pSlots.has(slot.id) || pSlots.has(slot.date))
        : pSlots.has(slot.id);

      if (isAvailable) {
        availableNames.push(p.name);
      } else {
        unavailableNames.push(p.name);
      }
    }

    const availableCount = availableNames.length;
    const percentage = total > 0 ? Math.round((availableCount / total) * 100) : 0;

    result[slot.id] = {
      slotId: slot.id,
      date: slot.date,
      time: slot.time,
      availableCount,
      totalParticipants: total,
      percentage,
      availableNames,
      unavailableNames,
    };
  }

  return result;
}

export function findBestTimeMatches(
  event: WanWangEvent,
  participants: Participant[],
  topN: number = 10,
  lang: Language = 'th'
): BestTimeMatch[] {
  if (participants.length === 0) return [];

  const granularity = event.granularity || 'hour';
  const total = participants.length;
  const candidateMatches: BestTimeMatch[] = [];
  const sets = availabilitySets(participants);
  const missingFrom = (availableNames: string[]) => {
    const available = new Set(availableNames);
    return participants.filter(p => !available.has(p.name)).map(p => p.name);
  };
  // Building a formatter is slow, and a year-long event produces thousands of candidates.
  const weekdayFormat = new Intl.DateTimeFormat(lang === 'th' ? 'th-TH' : 'en-US', { weekday: 'short' });

  if (granularity === 'day') {
    for (const date of event.dates) {
      const [year, month, day] = date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const availableParticipants = participants.filter(p => sets.get(p)!.has(date));

      if (availableParticipants.length > 0) {
        const availableCount = availableParticipants.length;
        const availableNames = availableParticipants.map(p => p.name);
        const missingNames = missingFrom(availableNames);

        candidateMatches.push({
          id: `${date}_day`,
          date,
          startTime: lang === 'th' ? 'ทั้งวัน' : 'All day',
          endTime: '',
          durationHours: 24,
          slotIds: [date],
          availableCount,
          totalParticipants: total,
          percentage: Math.round((availableCount / total) * 100),
          availableNames,
          missingNames,
          dayOfWeekThai: weekdayFormat.format(dateObj),
          formattedThai: formatLocalizedDate(date, lang, 'chip'),
          dayPartLabel: lang === 'th' ? 'ทั้งวัน' : 'All day',
        });
      }
    }

    candidateMatches.sort((a, b) => {
      if (b.availableCount !== a.availableCount) return b.availableCount - a.availableCount;
      return a.date.localeCompare(b.date);
    });

    return candidateMatches.slice(0, topN);
  }

  if (granularity === 'daypart') {
    const dayParts: { id: DayPartId; labelTh: string; labelEn: string; start: string; end: string }[] = [
      { id: 'morning', labelTh: 'เช้า (06–12)', labelEn: 'Morning (06–12)', start: '06:00', end: '12:00' },
      { id: 'afternoon', labelTh: 'บ่าย (12–17)', labelEn: 'Afternoon (12–17)', start: '12:00', end: '17:00' },
      { id: 'evening', labelTh: 'เย็น (17–21)', labelEn: 'Evening (17–21)', start: '17:00', end: '21:00' },
      { id: 'night', labelTh: 'ค่ำ (21–24)', labelEn: 'Night (21–24)', start: '21:00', end: '24:00' },
    ];

    for (const date of event.dates) {
      const [year, month, day] = date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);

      for (const dp of dayParts) {
        const slotId = `${date}T${dp.id}`;
        const availableParticipants = participants.filter(p => sets.get(p)!.has(slotId));

        if (availableParticipants.length > 0) {
          const availableCount = availableParticipants.length;
          const availableNames = availableParticipants.map(p => p.name);
          const missingNames = missingFrom(availableNames);

          candidateMatches.push({
            id: `${date}_${dp.id}`,
            date,
            startTime: dp.start,
            endTime: dp.end,
            durationHours: dp.id === 'morning' ? 6 : dp.id === 'afternoon' ? 5 : dp.id === 'evening' ? 4 : 3,
            slotIds: [slotId],
            availableCount,
            totalParticipants: total,
            percentage: Math.round((availableCount / total) * 100),
            availableNames,
            missingNames,
            dayOfWeekThai: weekdayFormat.format(dateObj),
            formattedThai: formatLocalizedDate(date, lang, 'chip'),
            dayPartLabel: lang === 'th' ? dp.labelTh : dp.labelEn,
          });
        }
      }
    }

    candidateMatches.sort((a, b) => {
      if (b.availableCount !== a.availableCount) return b.availableCount - a.availableCount;
      return a.date.localeCompare(b.date);
    });

    return candidateMatches.slice(0, topN);
  }

  // Hourly slots
  const interval = event.slotInterval || 60;
  for (const date of event.dates) {
    const dayTimes = generateDayTimeSlots(event.startTime || '09:00', event.endTime || '22:00', interval);
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    for (let i = 0; i < dayTimes.length; i++) {
      const startTime = dayTimes[i];
      for (let len = 1; len <= Math.min(4, dayTimes.length - i); len++) {
        const blockSlotIds = dayTimes.slice(i, i + len).map(t => `${date}T${t}`);
        const endMinutes = timeToMinutes(dayTimes[i + len - 1]) + interval;
        const endTime = minutesToTime(endMinutes);

        const availableParticipants = participants.filter(p => {
          const pSlots = sets.get(p)!;
          return blockSlotIds.every(slotId => pSlots.has(slotId) || pSlots.has(date));
        });

        if (availableParticipants.length > 0) {
          const availableCount = availableParticipants.length;
          const availableNames = availableParticipants.map(p => p.name);
          const missingNames = missingFrom(availableNames);

          candidateMatches.push({
            id: `${date}_${startTime}_${endTime}`,
            date,
            startTime,
            endTime,
            durationHours: (len * interval) / 60,
            slotIds: blockSlotIds,
            availableCount,
            totalParticipants: total,
            percentage: Math.round((availableCount / total) * 100),
            availableNames,
            missingNames,
            dayOfWeekThai: weekdayFormat.format(dateObj),
            formattedThai: formatLocalizedDate(date, lang, 'chip'),
          });
        }
      }
    }
  }

  candidateMatches.sort((a, b) => {
    if (b.availableCount !== a.availableCount) return b.availableCount - a.availableCount;
    if (b.durationHours !== a.durationHours) return b.durationHours - a.durationHours;
    return a.date.localeCompare(b.date);
  });

  const finalMatches: BestTimeMatch[] = [];
  const coveredKey = new Set<string>();

  for (const match of candidateMatches) {
    const key = `${match.date}-${match.startTime}`;
    if (!coveredKey.has(key)) {
      coveredKey.add(key);
      finalMatches.push(match);
      if (finalMatches.length >= topN) break;
    }
  }

  return finalMatches;
}

// Date range label; includes the year when the range crosses into another year.
export function formatLocalizedDateRange(start: string, end: string, lang: Language = 'th'): string {
  const format = start.slice(0, 4) === end.slice(0, 4) ? 'chip' : 'weekday';
  return `${formatLocalizedDate(start, lang, format)} - ${formatLocalizedDate(end, lang, format)}`;
}

// Generate Share Message Localized
export function generateShareMessage(
  event: WanWangEvent,
  participants: Participant[],
  eventUrl: string,
  lang: Language = 'th'
): string {
  const total = participants.length;
  const granularity = event.granularity || 'hour';
  const bestMatches = findBestTimeMatches(event, participants, 3, lang);

  if (lang === 'th') {
    let text = `[นัดหมาย] ${event.title}\n`;
    if (event.confirmedDate) {
      text += `📌 [ยืนยันวันนัดหมายแล้ว]: ${formatLocalizedDate(event.confirmedDate, lang, 'chip')}\n`;
    }
    const formatName = granularity === 'day' ? 'ทั้งวัน' : granularity === 'daypart' ? 'ช่วงของวัน' : 'รายชั่วโมง';
    text += `รูปแบบ: ${formatName}\n`;
    if (event.description) text += `รายละเอียด: ${event.description}\n`;
    if (event.location) text += `สถานที่: ${event.location}\n`;
    text += `ลงเวลาแล้ว: ${total} คน\n\n`;

    if (total === 0) {
      text += `ยังไม่มีใครลงเวลาว่างเลย เข้าไปเลือกเวลากันได้ที่ลิงก์นี้:\n👉 ${eventUrl}`;
      return text;
    }

    if (bestMatches.length > 0) {
      text += `🔥 ช่วงเวลาที่เพื่อนๆ ว่างตรงกันมากที่สุด:\n`;
      bestMatches.forEach((match, idx) => {
        if (granularity === 'day') {
          text += `[#${idx + 1}] ${match.formattedThai} (ทั้งวัน)\n`;
        } else if (granularity === 'daypart') {
          text += `[#${idx + 1}] ${match.formattedThai} - ${match.dayPartLabel}\n`;
        } else {
          text += `[#${idx + 1}] ${match.formattedThai} (${match.startTime} - ${match.endTime} น.)\n`;
        }
        text += `    ว่าง: ${match.availableNames.join(', ')} (${match.availableCount}/${total} คน - ${match.percentage}%)\n`;
        if (match.missingNames.length > 0) {
          text += `    ติดธุระ: ${match.missingNames.join(', ')}\n`;
        }
      });
      text += `\n`;
    }

    text += `กดเลือกหรือเปลี่ยนเวลาว่างของคุณได้ที่นี่:\n👉 ${eventUrl}`;
    return text;
  }

  // English
  let text = `[EVENT] ${event.title}\n`;
  if (event.confirmedDate) {
    text += `📌 [CONFIRMED DATE]: ${formatLocalizedDate(event.confirmedDate, lang, 'chip')}\n`;
  }
  const formatName = granularity === 'day' ? 'All-day' : granularity === 'daypart' ? 'Day parts' : 'Hourly';
  text += `Format: ${formatName}\n`;
  if (event.description) text += `Note: ${event.description}\n`;
  if (event.location) text += `Location: ${event.location}\n`;
  text += `Responses: ${total} people\n\n`;

  if (total === 0) {
    text += `No responses yet. Pick your available times here:\n👉 ${eventUrl}`;
    return text;
  }

  if (bestMatches.length > 0) {
    text += `🔥 Top matching times:\n`;
    bestMatches.forEach((match, idx) => {
      if (granularity === 'day') {
        text += `[#${idx + 1}] ${match.formattedThai} (All day)\n`;
      } else if (granularity === 'daypart') {
        text += `[#${idx + 1}] ${match.formattedThai} - ${match.dayPartLabel}\n`;
      } else {
        text += `[#${idx + 1}] ${match.formattedThai} (${match.startTime} - ${match.endTime})\n`;
      }
      text += `    Free: ${match.availableNames.join(', ')} (${match.availableCount}/${total} - ${match.percentage}%)\n`;
      if (match.missingNames.length > 0) {
        text += `    Busy: ${match.missingNames.join(', ')}\n`;
      }
    });
    text += `\n`;
  }

  text += `Vote or update your availability here:\n👉 ${eventUrl}`;
  return text;
}

// ============================================================================
// CONSECUTIVE DATES GROUPING FOR ACTIVE CHIPS
// ============================================================================

export interface ConsecutiveDateGroup {
  id: string;
  dates: string[];
  startDate: string;
  endDate: string;
  count: number;
}

export function isNextDay(dateStr1: string, dateStr2: string): boolean {
  const [y1, m1, d1] = dateStr1.split('-').map(Number);
  const [y2, m2, d2] = dateStr2.split('-').map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);
  date1.setDate(date1.getDate() + 1);

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function groupConsecutiveDates(sortedDates: string[]): ConsecutiveDateGroup[] {
  if (sortedDates.length === 0) return [];
  const sorted = [...sortedDates].sort();
  const groups: ConsecutiveDateGroup[] = [];
  let currentGroup: string[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    if (isNextDay(sorted[i - 1], sorted[i])) {
      currentGroup.push(sorted[i]);
    } else {
      groups.push({
        id: `${currentGroup[0]}_${currentGroup[currentGroup.length - 1]}`,
        dates: currentGroup,
        startDate: currentGroup[0],
        endDate: currentGroup[currentGroup.length - 1],
        count: currentGroup.length,
      });
      currentGroup = [sorted[i]];
    }
  }

  if (currentGroup.length > 0) {
    groups.push({
      id: `${currentGroup[0]}_${currentGroup[currentGroup.length - 1]}`,
      dates: currentGroup,
      startDate: currentGroup[0],
      endDate: currentGroup[currentGroup.length - 1],
      count: currentGroup.length,
    });
  }

  return groups;
}

export interface DateChipData {
  id: string;
  isRange: boolean;
  count: number;
  dates: string[];
  dayOfWeek?: string;
  dayNum?: number;
  month?: string;
  isSameMonth?: boolean;
  startDay?: number;
  endDay?: number;
  startMonth?: string;
  endMonth?: string;
}

export function getDateChipData(group: ConsecutiveDateGroup, lang: Language): DateChipData {
  const [y1, m1, d1] = group.startDate.split('-').map(Number);
  const startDateObj = new Date(y1, m1 - 1, d1);

  if (group.count === 1) {
    const dayOfWeekIdx = startDateObj.getDay();
    const dayOfWeek = lang === 'th' ? THAI_SHORT_WEEKDAYS[dayOfWeekIdx] : `${EN_SHORT_WEEKDAYS[dayOfWeekIdx]},`;
    const month = lang === 'th' ? THAI_SHORT_MONTHS[m1 - 1] : EN_SHORT_MONTHS[m1 - 1];
    return {
      id: group.id,
      isRange: false,
      count: 1,
      dates: group.dates,
      dayOfWeek,
      dayNum: d1,
      month,
    };
  }

  const [y2, m2, d2] = group.endDate.split('-').map(Number);
  const startMonth = lang === 'th' ? THAI_SHORT_MONTHS[m1 - 1] : EN_SHORT_MONTHS[m1 - 1];
  const endMonth = lang === 'th' ? THAI_SHORT_MONTHS[m2 - 1] : EN_SHORT_MONTHS[m2 - 1];
  const isSameMonth = m1 === m2 && y1 === y2;

  return {
    id: group.id,
    isRange: true,
    count: group.count,
    dates: group.dates,
    isSameMonth,
    startDay: d1,
    endDay: d2,
    startMonth,
    endMonth,
  };
}
