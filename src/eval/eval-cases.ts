export interface EvalCase {
  id: string;
  question: string;
  source?: string;
  expectAnswerable: boolean;
  // Only checked when expectAnswerable is true — lowercase substrings
  // that must all appear in the answer for the case to pass.
  expectedKeywords?: string[];
}

export const EVAL_CASES: EvalCase[] = [
  {
    id: 'rocky-identity',
    question: 'Who is Rocky?',
    expectAnswerable: true,
    expectedKeywords: ['alien'],
  },
  {
    id: 'protagonist-profession',
    question: "What was Grace's profession before the mission?",
    expectAnswerable: true,
    expectedKeywords: ['teacher'],
  },
  {
    id: 'astrophage-threat',
    question: 'What is Astrophage and why is it a threat to Earth?',
    expectAnswerable: true,
    expectedKeywords: ['astrophage'],
  },
  {
    id: 'crewmates-fate',
    question:
      "What happened to Grace's crewmates, Yáo and Ilyukhina, during the mission?",
    expectAnswerable: true,
    expectedKeywords: ['died'],
  },
  {
    id: 'hail-mary-fuel',
    question: 'What does the Hail Mary use for fuel/propulsion?',
    expectAnswerable: true,
    expectedKeywords: ['astrophage'],
  },
  {
    id: 'protagonist-amnesia',
    question: 'Why does Grace have amnesia at the start of the story?',
    expectAnswerable: true,
    expectedKeywords: ['coma'],
  },
  {
    id: 'taumoeba-discovery',
    question: 'What is Taumoeba and why is it important to the mission?',
    expectAnswerable: true,
    expectedKeywords: ['taumoeba'],
  },
  {
    id: 'rocky-species-weakness',
    question: "What is a key physical weakness of Rocky's species?",
    expectAnswerable: true,
    expectedKeywords: ['pressure'],
  },
  {
    id: 'mission-purpose',
    question: 'What is the overall purpose of the Hail Mary mission?',
    expectAnswerable: true,
    expectedKeywords: ['astrophage'],
  },
  {
    id: 'unanswerable-capital-of-france',
    question: 'What is the capital of France?',
    expectAnswerable: false,
  },
  {
    id: 'unanswerable-world-series',
    question: 'Who won the 2020 World Series?',
    expectAnswerable: false,
  },
  {
    id: 'unanswerable-weather',
    question: 'What is the current weather in Tokyo?',
    expectAnswerable: false,
  },
];
