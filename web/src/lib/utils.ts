export function cn(...inputs: (string | undefined | null | false | Record<string, boolean>)[]) {
  return inputs.filter(Boolean).join(' ');
}
