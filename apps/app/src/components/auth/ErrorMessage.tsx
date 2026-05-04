type ErrorMessageProps = {
  error: string;
};

export function ErrorMessage({ error }: ErrorMessageProps) {
  if (!error) return null;
  return <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>;
}
