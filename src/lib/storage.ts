import fs from 'fs';
import path from 'path';
import { Participant } from '@/types';

const DATA_FILE = path.join(process.cwd(), 'data', 'participants.json');

// In-memory fallback if filesystem write is restricted (e.g. on serverless Vercel)
let inMemoryStore: Participant[] | null = null;

export const INITIAL_PARTICIPANTS: Participant[] = [
  {
    id: 'p1',
    name: 'Member 1',
    partyRole: '[removed]',
    favoriteDrink: '[removed]',
    availableDates: [
      getFormattedDate(0, 5), // Friday next week
      getFormattedDate(0, 6), // Saturday next week
      getFormattedDate(0, 7), // Sunday next week
      getFormattedDate(1, 5),
      getFormattedDate(1, 6),
      getFormattedDate(1, 7),
    ],
    maybeDates: [getFormattedDate(2, 6)],
    note: '[removed]',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p2',
    name: 'Member 4',
    partyRole: '[removed]',
    favoriteDrink: '[removed]',
    availableDates: [
      getFormattedDate(0, 5),
      getFormattedDate(0, 6),
      getFormattedDate(1, 6),
      getFormattedDate(1, 7),
    ],
    maybeDates: [getFormattedDate(0, 7)],
    note: '[removed]',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p3',
    name: 'Member 2',
    partyRole: '[removed]',
    favoriteDrink: '[removed]',
    availableDates: [
      getFormattedDate(0, 6),
      getFormattedDate(0, 7),
      getFormattedDate(1, 5),
      getFormattedDate(1, 6),
    ],
    maybeDates: [],
    note: '[removed]',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p4',
    name: 'Member 3',
    partyRole: '[removed]',
    favoriteDrink: '[removed]',
    availableDates: [
      getFormattedDate(0, 6),
      getFormattedDate(1, 6),
      getFormattedDate(2, 6),
    ],
    maybeDates: [getFormattedDate(0, 5)],
    note: '[removed]',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p5',
    name: 'Member 5',
    partyRole: '[removed]',
    favoriteDrink: '[removed]',
    availableDates: [
      getFormattedDate(0, 5),
      getFormattedDate(0, 6),
      getFormattedDate(1, 6),
    ],
    maybeDates: [getFormattedDate(1, 5)],
    note: '[removed]',
    createdAt: new Date().toISOString(),
  },
];

// Helper to generate dynamic dates relative to current date (e.g. weekOffset, dayOfWeek 5=Fri, 6=Sat, 7=Sun)
function getFormattedDate(weekOffset: number, dayOfWeek: number): string {
  const now = new Date();
  const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  // Normalize to Monday = 1 ... Sunday = 7
  const currentNormalized = currentDay === 0 ? 7 : currentDay;
  const daysToAdd = (dayOfWeek - currentNormalized) + (weekOffset * 7);
  
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + (daysToAdd < 0 ? daysToAdd + 7 : daysToAdd));
  
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function getParticipants(): Promise<Participant[]> {
  try {
    if (inMemoryStore !== null) {
      return inMemoryStore;
    }

    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      inMemoryStore = JSON.parse(data);
      return inMemoryStore || [];
    } else {
      // Initialize with mock data
      await saveParticipants(INITIAL_PARTICIPANTS);
      return INITIAL_PARTICIPANTS;
    }
  } catch (error) {
    console.error('Error reading participants:', error);
    return inMemoryStore || INITIAL_PARTICIPANTS;
  }
}

export async function saveParticipants(participants: Participant[]): Promise<boolean> {
  try {
    inMemoryStore = participants;
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(participants, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving participants to disk, keeping in memory:', error);
    inMemoryStore = participants;
    return true;
  }
}

export async function addOrUpdateParticipant(participant: Participant): Promise<Participant[]> {
  const list = await getParticipants();
  const existingIndex = list.findIndex(
    p => p.id === participant.id || p.name.trim().toLowerCase() === participant.name.trim().toLowerCase()
  );

  let updatedList: Participant[];
  if (existingIndex >= 0) {
    updatedList = [...list];
    updatedList[existingIndex] = {
      ...list[existingIndex],
      ...participant,
      id: list[existingIndex].id, // keep original ID
    };
  } else {
    updatedList = [participant, ...list];
  }

  await saveParticipants(updatedList);
  return updatedList;
}

export async function deleteParticipant(id: string): Promise<Participant[]> {
  const list = await getParticipants();
  const updatedList = list.filter(p => p.id !== id);
  await saveParticipants(updatedList);
  return updatedList;
}

export async function resetParticipants(): Promise<Participant[]> {
  await saveParticipants(INITIAL_PARTICIPANTS);
  return INITIAL_PARTICIPANTS;
}

export async function clearAllParticipants(): Promise<Participant[]> {
  await saveParticipants([]);
  return [];
}
