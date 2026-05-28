import { scrapeVisibleJobsInPage, type ScrapeJobsPayload } from '../lib/linkedin-scrape';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SCRAPE_VISIBLE_JOBS') {
    try {
      const payload = message.payload as ScrapeJobsPayload;
      sendResponse(scrapeVisibleJobsInPage(payload));
    } catch (e) {
      sendResponse({
        ok: false,
        error: e instanceof Error ? e.message : 'Scrape failed',
      });
    }
    return true;
  }
  return false;
});
