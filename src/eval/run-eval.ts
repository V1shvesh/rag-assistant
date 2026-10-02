import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { GenerationService } from '../generation/generation.service';
import { EVAL_CASES } from './eval-cases';

interface CaseResult {
  id: string;
  passed: boolean;
  question: string;
  answer: string;
}

// Claude phrases a correct refusal in slightly different ways across
// calls (e.g. "I don't know" vs. "I cannot answer this question based on
// the provided passages") — this list is deliberately a few common
// refusal shapes, not an attempt to parse intent.
const REFUSAL_PHRASES = [
  "i don't know",
  'i cannot answer',
  "don't contain information",
  'does not contain information',
  "doesn't contain information",
  "don't have information",
  "i can't",
];

function grade(
  expectAnswerable: boolean,
  expectedKeywords: string[] | undefined,
  answer: string,
  groundedInContext: boolean,
): boolean {
  const lowerAnswer = answer.toLowerCase();

  if (!expectAnswerable) {
    return (
      !groundedInContext ||
      REFUSAL_PHRASES.some((phrase) => lowerAnswer.includes(phrase))
    );
  }

  return (
    groundedInContext &&
    (expectedKeywords ?? []).every((keyword) =>
      lowerAnswer.includes(keyword.toLowerCase()),
    )
  );
}

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const generationService = app.get(GenerationService);

  const results: CaseResult[] = [];

  for (const evalCase of EVAL_CASES) {
    try {
      const result = await generationService.answer(
        evalCase.question,
        undefined,
        evalCase.source,
      );
      const passed = grade(
        evalCase.expectAnswerable,
        evalCase.expectedKeywords,
        result.answer,
        result.groundedInContext,
      );
      results.push({
        id: evalCase.id,
        passed,
        question: evalCase.question,
        answer: result.answer,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        id: evalCase.id,
        passed: false,
        question: evalCase.question,
        answer: `ERROR: ${message}`,
      });
    }
  }

  for (const result of results) {
    const status = result.passed ? 'PASS' : 'FAIL';
    const truncatedAnswer =
      result.answer.length > 100
        ? `${result.answer.slice(0, 100)}...`
        : result.answer;
    console.log(`[${status}] ${result.id}: ${result.question}`);
    console.log(`       -> ${truncatedAnswer}`);
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n${passedCount}/${results.length} passed`);

  await app.close();
  process.exit(passedCount === results.length ? 0 : 1);
}

run().catch((error) => {
  console.error('Eval run failed to start:', error);
  process.exit(1);
});
