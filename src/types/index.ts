export type PartyRole =
  | '[removed]'
  | '[removed]'
  | '[removed]'
  | '[removed]'
  | 'สายเปิดเพลง/ยึดไมค์'
  | '[removed]'
  | 'สายชิลล์/แช่น้ำเป็ดเหลือง'
  | 'สายลากเพื่อนเข้าตี้';

export interface Participant {
  id: string;
  name: string;
  partyRole: PartyRole | string;
  favoriteDrink?: string;
  availableDates: string[]; // YYYY-MM-DD
  maybeDates?: string[]; // YYYY-MM-DD (50/50)
  note?: string;
  createdAt: string;
}

export interface DateSummary {
  date: string; // YYYY-MM-DD
  count: number;
  maybeCount: number;
  availableParticipants: Participant[];
  maybeParticipants: Participant[];
  isWeekend: boolean;
  dayOfWeekThai: string;
  formattedThai: string;
}
