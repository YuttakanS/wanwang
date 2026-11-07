import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Participant, DateSummary } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
export const THAI_DAYS_FULL = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];

export function formatThaiDate(dateString: string, format: 'short' | 'full' | 'weekday' = 'short'): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  
  const thaiYearShort = (year + 543) % 100;
  const thaiYearFull = year + 543;
  const dayNameShort = THAI_DAYS_SHORT[dateObj.getDay()];
  const dayNameFull = THAI_DAYS_FULL[dateObj.getDay()];
  const monthNameShort = THAI_MONTHS_SHORT[month - 1];
  const monthNameFull = THAI_MONTHS_FULL[month - 1];

  if (format === 'weekday') {
    return `${dayNameShort} ${day} ${monthNameShort}`;
  }
  if (format === 'full') {
    return `${dayNameFull}ที่ ${day} ${monthNameFull} ${thaiYearFull}`;
  }
  return `${day} ${monthNameShort} ${thaiYearShort}`;
}

export function isWeekend(dateString: string): boolean {
  const [year, month, day] = dateString.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}

export function isFriday(dateString: string): boolean {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).getDay() === 5;
}

// Calculate summary stats for each date
export function computeDateSummaries(participants: Participant[]): DateSummary[] {
  const dateMap = new Map<string, { available: Participant[]; maybe: Participant[] }>();

  participants.forEach(p => {
    (p.availableDates || []).forEach(d => {
      if (!dateMap.has(d)) dateMap.set(d, { available: [], maybe: [] });
      dateMap.get(d)!.available.push(p);
    });

    (p.maybeDates || []).forEach(d => {
      if (!dateMap.has(d)) dateMap.set(d, { available: [], maybe: [] });
      dateMap.get(d)!.maybe.push(p);
    });
  });

  const summaries: DateSummary[] = [];

  dateMap.forEach((val, dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();

    summaries.push({
      date: dateStr,
      count: val.available.length,
      maybeCount: val.maybe.length,
      availableParticipants: val.available,
      maybeParticipants: val.maybe,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      dayOfWeekThai: THAI_DAYS_SHORT[dayOfWeek],
      formattedThai: formatThaiDate(dateStr, 'weekday'),
    });
  });

  // Sort by count desc, then date asc
  return summaries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (b.maybeCount !== a.maybeCount) return b.maybeCount - a.maybeCount;
    return a.date.localeCompare(b.date);
  });
}

// Generate text for sharing to LINE
export function generateLineShareSummary(participants: Participant[], webUrl: string): string {
  const summaries = computeDateSummaries(participants);
  const total = participants.length;
  
  if (total === 0) {
    return `🍻 [ทริป: วันว่าง] 🏊‍♂️🍾\nยังไม่มีใครลงวันว่างเลยเพื่อน!\nมากดเลือกวันว่างด่วนๆ ก่อนสระจะแห้ง 👉 ${webUrl}`;
  }

  const top3 = summaries.slice(0, 3);
  let text = `🍻 [สรุปวันว่าง: วันว่าง] 🏊‍♂️🍾\n`;
  text += `👥 ลงชื่อแล้วทั้งหมด: ${total} คน\n\n`;
  text += `🔥 วันที่เพื่อนๆ ว่างตรงกันมากที่สุด:\n`;

  const medals = ['🥇', '🥈', '🥉'];
  top3.forEach((s, idx) => {
    const medal = medals[idx] || '⭐';
    const names = s.availableParticipants.map(p => p.name).join(', ');
    text += `${medal} ${s.dayOfWeekThai} ${formatThaiDate(s.date, 'weekday')} (ว่าง ${s.count}/${total} คน)\n`;
    text += `   👉 คนว่าง: ${names}\n`;
    if (s.maybeParticipants.length > 0) {
      const maybeNames = s.maybeParticipants.map(p => p.name).join(', ');
      text += `   🤔 ก้ำกึ่ง 50/50: ${maybeNames}\n`;
    }
  });

  text += `\n📲 ใครยังไม่ได้ลงวันว่าง หรืออยากเปลี่ยนวัน รีบมากดเลยที่ลิงก์นี้:\n👉 ${webUrl}`;
  return text;
}
