import type { GeneratedAnswer, LinkedInJob } from './ai';

export type ApplicationHistoryItem = {
  id: string;
  createdAt: string;
  job: LinkedInJob;
  selected: boolean;
  answers: GeneratedAnswer[];
};

const HISTORY_KEY = 'application_history_v1';

export async function getHistory(): Promise<ApplicationHistoryItem[]> {
  const data = await chrome.storage.local.get(HISTORY_KEY);
  return (data[HISTORY_KEY] as ApplicationHistoryItem[] | undefined) ?? [];
}

export async function saveHistory(items: ApplicationHistoryItem[]): Promise<void> {
  await chrome.storage.local.set({ [HISTORY_KEY]: items });
}

export async function appendHistory(item: ApplicationHistoryItem): Promise<void> {
  const history = await getHistory();
  history.unshift(item);
  await saveHistory(history.slice(0, 50));
}
