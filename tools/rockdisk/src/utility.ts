export function parseSize(size: string | number): number {
  if (typeof size === 'number') {
    return size;
  }

  const radix: number = size.endsWith('h') ? 16 : 10;
  const parsedSize: number = Number.parseInt(size, radix);
  if (isNaN(parsedSize)) {
    throw new Error(`size '${size}' cannot be converted to a number`);
  }

  return parsedSize;
}
