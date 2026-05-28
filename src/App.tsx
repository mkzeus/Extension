import { useEffect, useState } from 'react';
import './index.css';
import { generateApplicationAnswers, type LinkedInJob } from './lib/ai';
import { parsePdfText } from './lib/pdf';
import { appendHistory, getHistory, type ApplicationHistoryItem } from './lib/storage';

type SearchState = 'idle' | 'loading';

function App() {
  const [title, setTitle] = useState('Software Engineer');
  const [location, setLocation] = useState('Dubai');
  const [jobs, setJobs] = useState<LinkedInJob[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cvText, setCvText] = useState('');
  const [cvName, setCvName] = useState('');
  const [status, setStatus] = useState('Ready.');
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [history, setHistory] = useState<ApplicationHistoryItem[]>([]);

  useEffect(() => {
    getHistory().then(setHistory).catch(() => setHistory([]));
  }, []);

  const selectedJobs = jobs.filter((job) => selectedIds.has(job.id));

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const searchJobs = async () => {
    if (!title.trim() || !location.trim()) {
      setStatus('Enter both job title and location.');
      return;
    }

    setSearchState('loading');
    setStatus('Scraping visible jobs from active LinkedIn Jobs tab...');
    console.log('[AI Job Copilot][popup] SEARCH_JOBS start', { title, location });

    const response = await chrome.runtime.sendMessage({
      type: 'SEARCH_JOBS',
      payload: { title, location },
    });

    setSearchState('idle');

    if (!response?.ok) {
      console.error('[AI Job Copilot][popup] SEARCH_JOBS failed', response?.error);
      setStatus(
        response?.error ??
          (response === undefined
            ? 'No response from the extension. Reload the extension on chrome://extensions and try again.'
            : 'Could not fetch jobs. Open a LinkedIn Jobs tab, refresh the page, then search again.'),
      );
      return;
    }

    const nextJobs = (response.jobs as LinkedInJob[]) || [];
    console.log('[AI Job Copilot][popup] SEARCH_JOBS success', { count: nextJobs.length, jobs: nextJobs });
    setJobs(nextJobs);
    setSelectedIds(new Set());
    setStatus(`Found ${nextJobs.length} visible LinkedIn jobs.`);
  };

  const onCvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setStatus('Upload a PDF CV file.');
      return;
    }

    setStatus('Parsing CV PDF...');
    setCvName(file.name);

    try {
      const text = await parsePdfText(file);
      setCvText(text);
      setStatus(`Parsed CV (${Math.min(text.length, 5000)} chars).`);
    } catch {
      setStatus('Failed to parse CV PDF.');
    }
  };

  const generateForSelection = async () => {
    if (selectedJobs.length === 0) {
      setStatus('Select at least one job.');
      return;
    }

    const historyItems: ApplicationHistoryItem[] = [];
    let needsManualInput = false;

    for (const job of selectedJobs) {
      const answers = generateApplicationAnswers(job, cvText);
      if (answers.some((a) => a.needsManualInput)) {
        needsManualInput = true;
      }

      const item: ApplicationHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
        job,
        selected: true,
        answers,
      };

      historyItems.push(item);
      await appendHistory(item);
    }

    const latestHistory = await getHistory();
    setHistory(latestHistory);

    if (needsManualInput) {
      await chrome.runtime.sendMessage({ type: 'SHOW_MANUAL_INPUT_NOTIFICATION' });
    }

    setStatus(`Generated answers for ${historyItems.length} job(s).`);
  };

  return (
    <div className="app-shell">
      <header>
        <h1>AI Job Copilot</h1>
        <p>LinkedIn search + CV parsing + AI-style application answers</p>
      </header>

      <section className="panel">
        <label>
          Job title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Frontend Engineer" />
        </label>
        <label>
          Location
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Remote" />
        </label>
        <button disabled={searchState === 'loading'} onClick={searchJobs}>
          {searchState === 'loading' ? 'Searching...' : 'Search LinkedIn'}
        </button>
      </section>

      <section className="panel">
        <label className="upload">
          Upload CV (PDF)
          <input type="file" accept="application/pdf" onChange={onCvUpload} />
        </label>
        <small>{cvName ? `Loaded: ${cvName}` : 'No CV uploaded yet.'}</small>
      </section>

      <section className="panel">
        <div className="section-title-row">
          <h2>Top matches</h2>
          <span>{jobs.length} items</span>
        </div>
        <div className="job-list">
          {jobs.length === 0 ? (
            <p className="muted">No jobs yet. Search to fetch top 5.</p>
          ) : (
            jobs.map((job) => (
              <label className="job-item" key={job.id}>
                <input type="checkbox" checked={selectedIds.has(job.id)} onChange={() => toggleSelection(job.id)} />
                <div>
                  <strong>{job.title}</strong>
                  <p>{job.company}</p>
                  <small>{job.location}</small>
                </div>
              </label>
            ))
          )}
        </div>
        <button onClick={generateForSelection}>Generate Application Answers</button>
      </section>

      <section className="panel">
        <div className="section-title-row">
          <h2>Application history</h2>
          <span>{history.length}</span>
        </div>
        <div className="history-list">
          {history.length === 0 ? (
            <p className="muted">No history yet.</p>
          ) : (
            history.slice(0, 5).map((item) => (
              <article key={item.id} className="history-item">
                <strong>{item.job.title}</strong>
                <p>{item.job.company}</p>
                <small>{new Date(item.createdAt).toLocaleString()}</small>
              </article>
            ))
          )}
        </div>
      </section>

      <footer>{status}</footer>
    </div>
  );
}

export default App;
