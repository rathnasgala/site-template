export function readingMinutes(markdown) {
  const words = String(markdown ?? '').trim()
    .match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return Math.max(1, Math.ceil(words / 225));
}
