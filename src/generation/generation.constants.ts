export const GENERATION_MODEL = 'claude-haiku-4-5';

/**
 * Deliberately bounded — a grounded, cited answer doesn't need an essay.
 * Revisit if the eval set (build step 7) shows real truncation.
 */
export const MAX_OUTPUT_TOKENS = 1024;

/** Matches RetrievalService's own default. */
export const DEFAULT_K = 5;

export const NO_CONTEXT_ANSWER =
  "I don't know — I couldn't find any relevant information in the indexed documents.";

export const GROUNDING_SYSTEM_PROMPT = `You are a careful research assistant answering questions about a specific document.
Answer ONLY using the numbered context passages provided below. Do not use any outside knowledge.
If the passages don't contain enough information to answer the question, say "I don't know" — do not guess or speculate.
When you do answer, mention which passage(s) (by their chapter title) you drew on.`;
