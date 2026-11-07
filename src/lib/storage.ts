import fs from 'fs';
import path from 'path';
import { Participant } from '@/types';

const DATA_FILE = path.join(process.cwd(), 'data', 'participants.json');

// In-memory fallback if filesystem write is restricted (e.g. on serverless Vercel)
let inMemoryStore: Participant[] | null = null;

export const INITIAL_PARTICIPANTS: Participant[] = [];

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
      await saveParticipants(INITIAL_PARTICIPANTS);
      return INITIAL_PARTICIPANTS;
    }
  } catch (error) {
    console.error('Error reading participants:', error);
    return inMemoryStore || [];
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
      id: list[existingIndex].id,
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
