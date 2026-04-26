import QUESTIONS from "./icebreaker-questions.json";

export function getIcebreakerQuestion(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      86400000,
  );
  return QUESTIONS[dayOfYear % QUESTIONS.length] ?? QUESTIONS[0];
}
