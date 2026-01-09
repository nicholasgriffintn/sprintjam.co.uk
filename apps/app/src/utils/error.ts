export const handleError = (
  message: string,
  onError?: (message: string) => void,
) => {
  if (onError) {
    onError(message);
  } else {
    console.error(message);
  }
};
