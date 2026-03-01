const copyWithExecCommand = (text: string) => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  const succeeded = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!succeeded) {
    throw new Error("Copy command was rejected");
  }
};

export const copyText = async (text: string) => {
  if (!text) {
    return;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document !== "undefined") {
    copyWithExecCommand(text);
    return;
  }

  throw new Error("Clipboard API is unavailable");
};
