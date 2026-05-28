/**
 * DOM scraping for LinkedIn Jobs list pages.
 * Used by the content script and as a fallback via chrome.scripting.executeScript.
 * scrapeVisibleJobsInPage must be fully self-contained (nested helpers only) so Chrome
 * can serialize `func` without losing module-level bindings.
 */

export type ScrapeJobsPayload = {
  title: string;
  location: string;
};

export type ScrapedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
};

export type ScrapeJobsResult =
  | { ok: true; jobs: ScrapedJob[] }
  | { ok: false; error: string };

/**
 * Runs in the LinkedIn Jobs tab context (isolated world when injected).
 * All helpers are nested so executeScript(func) serialization works.
 */
export function scrapeVisibleJobsInPage(payload: ScrapeJobsPayload): ScrapeJobsResult {
  const MAX_JOBS = 5;

  function normalize(s: string): string {
    return s.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function textMatch(haystack: string, needle: string): boolean {
    const h = normalize(haystack);
    const n = normalize(needle);
    if (!n) return true;
    return h.includes(n);
  }

  function pickText(el: Element | null, selectors: string[]): string {
    if (!el) return '';
    for (const sel of selectors) {
      const found = el.querySelector(sel);
      if (found?.textContent?.trim()) return found.textContent.trim();
    }
    return '';
  }

  const normalizedTitle = normalize(payload.title);
  const normalizedLocation = normalize(payload.location);

  const listSelectors = [
    'li.scaffold-layout__list-item',
    'li.jobs-search-results__list-item',
    'li[data-occludable-job-id]',
    'div.scaffold-layout__list-item',
    'li[class*="jobs-search-results"]',
    'ul.jobs-search__results-list > li',
    'div[data-job-id]',
    'li[class*="job-card-container"]',
  ];

  let cards: Element[] = [];
  for (const sel of listSelectors) {
    const found = Array.from(document.querySelectorAll(sel));
    if (found.length) {
      cards = found;
      break;
    }
  }

  if (cards.length === 0) {
    return {
      ok: false,
      error:
        'No job list found on this page. Open LinkedIn Jobs search (URL contains /jobs/) and scroll until job cards appear, then try again.',
    };
  }

  const titleSelectors = [
    '.job-card-list__title',
    'a.job-card-container__link strong',
    'a[data-control-name="job_card_title"] span',
    'h3.base-search-card__title',
    'a.job-card-list__title-link',
    'span[aria-hidden="true"]',
    '.artdeco-entity-lockup__title',
  ];

  const companySelectors = [
    '.job-card-container__primary-description',
    'h4.base-search-card__subtitle',
    '.artdeco-entity-lockup__subtitle',
    '[data-test-job-card-company-name]',
    '.job-card-container__company-name',
  ];

  const locationSelectors = [
    '.job-card-container__metadata-item',
    'span.job-card-container__metadata-item',
    '.job-card-list__metadata-wrapper li',
    '.artdeco-entity-lockup__caption',
  ];

  const jobs: ScrapedJob[] = [];
  const seen = new Set<string>();

  for (const card of cards) {
    const title =
      pickText(card, titleSelectors) ||
      card.querySelector('a[href*="/jobs/view/"]')?.textContent?.trim() ||
      '';

    const company = pickText(card, companySelectors);

    let location = '';
    for (const sel of locationSelectors) {
      const nodes = card.querySelectorAll(sel);
      for (const n of nodes) {
        const t = n.textContent?.trim() || '';
        if (t && t !== title && t !== company) {
          location = t;
          break;
        }
      }
      if (location) break;
    }

    const link =
      (card.querySelector('a[href*="/jobs/view/"]') as HTMLAnchorElement | null)?.href ||
      (card.querySelector('a[href*="/jobs/collections/"]') as HTMLAnchorElement | null)?.href ||
      '';

    if (!title || !company || !link.includes('/jobs/')) continue;

    const id = link.split('?')[0] || `${title}-${company}`;

    if (seen.has(id)) continue;
    seen.add(id);

    if (textMatch(title, normalizedTitle) && textMatch(location, normalizedLocation)) {
      jobs.push({ id, title, company, location, url: link });
    }

    if (jobs.length >= MAX_JOBS) break;
  }

  // If filters are too strict, return top visible cards (still require basic fields).
  if (jobs.length === 0 && cards.length > 0) {
    seen.clear();
    for (const card of cards) {
      const title =
        pickText(card, titleSelectors) ||
        card.querySelector('a[href*="/jobs/view/"]')?.textContent?.trim() ||
        '';
      const company = pickText(card, companySelectors);
      let location = '';
      for (const sel of locationSelectors) {
        const nodes = card.querySelectorAll(sel);
        for (const n of nodes) {
          const t = n.textContent?.trim() || '';
          if (t && t !== title && t !== company) {
            location = t;
            break;
          }
        }
        if (location) break;
      }
      const link =
        (card.querySelector('a[href*="/jobs/view/"]') as HTMLAnchorElement | null)?.href ||
        (card.querySelector('a[href*="/jobs/collections/"]') as HTMLAnchorElement | null)?.href ||
        '';
      if (!title || !company || !link.includes('/jobs/')) continue;
      const id = link.split('?')[0] || `${title}-${company}`;
      if (seen.has(id)) continue;
      seen.add(id);
      jobs.push({ id, title, company, location, url: link });
      if (jobs.length >= MAX_JOBS) break;
    }
  }

  if (jobs.length === 0) {
    return {
      ok: false,
      error:
        'Found job cards but could not read title/company/links. Try refreshing the Jobs page or scroll so the list is fully visible.',
    };
  }

  return { ok: true, jobs };
}

export function isLinkedInJobsUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return (
      (u.hostname === 'linkedin.com' ||
        u.hostname === 'www.linkedin.com' ||
        u.hostname.endsWith('.linkedin.com')) &&
      u.pathname.startsWith('/jobs')
    );
  } catch {
    return false;
  }
}
