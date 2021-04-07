namespace Util {
  export namespace Arrays {
    export class FixedArray<T> implements Iterable<T> {
      public readonly length: number;
      // for bracket access
      // no assignment to an index, only reading and
      readonly [index: number]: T;

      constructor(...values: T[]) {
        // create bracket access
        values.forEach((value, index) => {
          // to write the initial elements into the indices
          // TS needs to be overridden

          // @ts-ignore
          this[index] = value;
        });

        this.length = values.length;
        this.asDynamicArray = () => {
          return [...values];
        };
      }

      public asDynamicArray: () => T[];

      public [Symbol.iterator](): Iterator<T, any, undefined> {
        let i = 0;

        const next = (() => ({
          value: this[i++],
          done: i === this.length + 1,
        })).bind(this);

        return {
          next,
        };
      }
    }
  }
  export namespace String {
    export class FixedString extends Arrays.FixedArray<String> {
      constructor(str: string) {
        super(...str);
      }
    }
  }
  export namespace Chars {
    type Character = string;
    export function isTypeofChar(ch: Character) {
      return ch.length === 1;
    }
    export function isAlpha(char: Character) {
      console.assert(isTypeofChar(char));

      return /[a-zA-Z]/.test(char);
    }
    export function isWhitespace(char: Character) {
      console.assert(isTypeofChar(char));

      return /\s|\r|\n/.test(char);
    }
    export function isDigit(char: Character) {
      console.assert(isTypeofChar(char));

      return /[0-9]/.test(char);
    }
  }
}
export default Util;
