import {
  isLinkedInJobsUrl,
  scrapeVisibleJobsInPage,
  type ScrapeJobsPayload,
  type ScrapeJobsResult,
} from '../lib/linkedin-scrape';

type SearchJobsMessage = {
  type: 'SEARCH_JOBS';
  payload?: unknown;
};

async function findLinkedInJobsTabId(): Promise<number | null> {
  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (active?.id != null && isLinkedInJobsUrl(active.url)) {
    return active.id;
  }

  const inWindow = await chrome.tabs.query({ lastFocusedWindow: true });
  const inFocused = inWindow.find((t) => t.id != null && isLinkedInJobsUrl(t.url));
  if (inFocused?.id != null) return inFocused.id;

  const any = await chrome.tabs.query({});
  const linkedIn = any.find((t) => t.id != null && isLinkedInJobsUrl(t.url));
  return linkedIn?.id ?? null;
}

function normalizeScrapePayload(payload: unknown): ScrapeJobsPayload {
  const p = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  return {
    title: typeof p.title === 'string' ? p.title : '',
    location: typeof p.location === 'string' ? p.location : '',
  };
}

async function scrapeLinkedInJobs(rawPayload: unknown): Promise<{
  ok: boolean;
  jobs?: unknown;
  error?: string;
}> {
  const payload = normalizeScrapePayload(rawPayload);
  const tabId = await findLinkedInJobsTabId();

  if (tabId == null) {
    return {
      ok: false,
      error:
        'No LinkedIn Jobs tab found. Open https://www.linkedin.com/jobs in a tab, then use Search from the extension.',
    };
  }

  let sendErrMsg: string | null = null;
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'SCRAPE_VISIBLE_JOBS',
      payload,
    });
    if (response != null && typeof response === 'object' && 'ok' in response) {
      const r = response as ScrapeJobsResult;
      if (r.ok) return { ok: true, jobs: r.jobs };
      return { ok: false, error: r.error ?? 'LinkedIn tab reported a scrape error.' };
    }
  } catch (sendErr) {
    sendErrMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
  }

  const msg = sendErrMsg ?? '';

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: scrapeVisibleJobsInPage,
      args: [payload],
    });
    const result = results?.[0]?.result;
    if (result != null && typeof result === 'object' && 'ok' in result) {
      const r = result as ScrapeJobsResult;
      if (r.ok) return { ok: true, jobs: r.jobs };
      return { ok: false, error: r.error ?? 'Scrape returned an error after injection.' };
    }
    return {
      ok: false,
      error:
        'Injected scrape returned no result. Reload the LinkedIn Jobs page, ensure you are on a job search/list URL, then try again.',
    };
  } catch (injectErr) {
    const injectMsg = injectErr instanceof Error ? injectErr.message : String(injectErr);
    return {
      ok: false,
      error: [
        'Could not talk to the LinkedIn tab.',
        msg.includes('Receiving end') || msg.includes('Could not establish connection')
          ? 'The page may need a refresh, or the tab is not on LinkedIn Jobs.'
          : msg,
        injectMsg !== msg ? `Injection: ${injectMsg}` : '',
      ]
        .filter(Boolean)
        .join(' '),
    };
  }
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  let responded = false;
  const respondOnce = (data: { ok: boolean; jobs?: unknown; error?: string }) => {
    if (responded) return;
    responded = true;
    try {
      sendResponse(data);
    } catch {
      // Channel may already be closed; nothing else we can do.
    }
  };

  const type =
    message != null && typeof message === 'object' && 'type' in message
      ? (message as { type?: unknown }).type
      : undefined;

  if (type === 'SEARCH_JOBS') {
    const payload =
      message != null && typeof message === 'object' && 'payload' in message
        ? (message as SearchJobsMessage).payload
        : undefined;
    void scrapeLinkedInJobs(payload)
      .then((result) => {
        respondOnce(
          result ?? {
            ok: false,
            error: 'Scraper returned no result.',
          },
        );
      })
      .catch((e) => {
        respondOnce({
          ok: false,
          error: e instanceof Error ? e.message : 'Unknown error while searching jobs.',
        });
      });
    return true;
  }

  if (type === 'SHOW_MANUAL_INPUT_NOTIFICATION') {
    void chrome.notifications
      .create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'AI Job Copilot',
        message: 'Some answers need your input. Open the extension popup to review.',
      })
      .then(() => respondOnce({ ok: true }))
      .catch(() =>
        respondOnce({
          ok: false,
          error: 'Could not show notification (check extension notification permission).',
        }),
      );
    return true;
  }

  return false;
});
