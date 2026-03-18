const QUESTIONS = [
  "What's the most interesting thing you've learned recently?",
  "If you could add one feature to your favourite app, what would it be?",
  "What's your current productivity hack?",
  "What's something outside work you're excited about right now?",
  "What's the weirdest bug you've ever encountered?",
  "If you could automate one thing in your life, what would it be?",
  "What's a tool or shortcut you wish more people knew about?",
  "What's something you're trying to get better at?",
  "What's the best piece of advice you've received recently?",
  "If you had an extra hour today, how would you spend it?",
  "What's your current favourite keyboard shortcut?",
  "What's something you've changed your mind about in the last year?",
  "What's the last thing that genuinely made you laugh?",
  "What's your go-to 'stuck on a problem' strategy?",
  "What's a book, podcast or article you'd recommend to the team?",
  "What's something you're proud of that nobody knows about?",
  "If you could swap jobs with anyone on the team for a day, who would it be?",
  "What's your desk setup like — anything unusual?",
  "What's a small win you had this week?",
  "What's your hot take on a tech topic?",
  "What's the most useful thing you've Googled this week?",
  "What's something you do to recharge?",
  "What would the title of your autobiography be?",
  "What's your current side project or hobby?",
  "If you could only use one programming language forever, which?",
  "What's a skill you'd love to learn but haven't had time for?",
  "What's the last thing you shipped that you're proud of?",
  "If the team had a mascot, what should it be?",
  "What's your unpopular opinion about software development?",
  "What's something that made your day easier this week?",
];

export function getIcebreakerQuestion(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      86400000,
  );
  return QUESTIONS[dayOfYear % QUESTIONS.length] ?? QUESTIONS[0];
}
