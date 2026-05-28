export type LinkedInJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
};

export type GeneratedAnswer = {
  question: string;
  answer: string;
  needsManualInput: boolean;
};

function extractCandidateName(cvText: string): string | null {
  const firstLine = cvText
    .split(/\n|\r/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return null;
  if (firstLine.length < 3 || firstLine.length > 40) return null;
  return firstLine;
}

export function generateApplicationAnswers(job: LinkedInJob, cvText: string): GeneratedAnswer[] {
  const name = extractCandidateName(cvText);
  const hasEnoughCv = cvText.length > 200;

  return [
    {
      question: 'Why are you interested in this role?',
      answer: `I am excited about the ${job.title} role at ${job.company} because it aligns with my experience and the kind of impact I want to make. I enjoy solving real business problems and collaborating with cross-functional teams to deliver measurable outcomes.`,
      needsManualInput: false,
    },
    {
      question: 'How does your experience match the position?',
      answer: hasEnoughCv
        ? `Based on my CV, I have relevant project experience and transferable skills that map well to this role in ${job.location}. I have worked on initiatives that required ownership, communication, and consistent execution under deadlines.`
        : 'Please add a richer CV so this answer can be more specific to your background.',
      needsManualInput: !hasEnoughCv,
    },
    {
      question: 'What is your current notice period?',
      answer: 'I can discuss start date flexibility and notice period based on business needs.',
      needsManualInput: true,
    },
    {
      question: 'Anything else you want us to know?',
      answer: `${name ? `${name} is` : 'I am'} motivated to contribute quickly, learn the domain deeply, and support the team with high-quality delivery.`,
      needsManualInput: false,
    },
  ];
}
