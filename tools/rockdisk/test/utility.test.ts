import { parseSize } from '../src/utility';

describe('Utility', () => {
  describe('parseSize()', () => {
    it("should return the parameter if it's a number", () => {
      expect(parseSize(123)).toBe(123);
    });

    it('should parse a string as decimal without a suffix', () => {
      expect(parseSize('123')).toBe(123);
    });

    it("should parse a string as decimal with a 'd' suffix", () => {
      expect(parseSize('123d')).toBe(123);
    });

    it("should parse a string as hexidecimal with a 'h' suffix", () => {
      expect(parseSize('10h')).toBe(0x10);
    });

    it('should throw an error if the number cannot be parsed', () => {
      const action = () => parseSize('what?');
      expect(action).toThrowError("size 'what?' cannot be converted to a number");
    });
  });
});
