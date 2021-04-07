import Util from './util';

namespace Tokenize {
  export namespace Token {
    export abstract class Token {
      public readonly value: string;
      public constructor(value: string) {
        this.value = value;
      }
    }

    export namespace GenericToken {
      export class InterpolatedJSToken extends Token {
        public constructor(javascriptValue: string) {
          super(javascriptValue);
        }
      }
      export class TextToken extends Token {
        constructor(value: string) {
          super(value);
        }
      }
    }
    export namespace SimpleToken {
      // represent chars
      export class XMLOpenTagCharToken extends GenericToken.TextToken {
        constructor() {
          super('<');
        }
      }
      export class XMLOpenEndTagCharToken extends GenericToken.TextToken {
        constructor() {
          super('</');
        }
      }
      export class XMLCloseTagCharToken extends GenericToken.TextToken {
        constructor() {
          super('>');
        }
      }
    }
    export namespace ComplexToken {
      export namespace XMLTagTypes {
        export type ParamTuple = [
          Readonly<GenericToken.TextToken>,
          Readonly<GenericToken.InterpolatedJSToken>
        ];

        export type ParamTupleCollection = Util.Arrays.FixedArray<
          Readonly<ParamTuple>
        >;
      }

      export class XMLOpenTagToken extends Token {
        public readonly params: XMLTagTypes.ParamTupleCollection;

        constructor(
          tagName: GenericToken.TextToken,
          params: XMLTagTypes.ParamTupleCollection
        ) {
          super(tagName.value);
          this.params = params;
        }
      }
      export class XMLCloseTagToken extends Token {
        constructor(tagName: GenericToken.TextToken) {
          super(tagName.value);
        }
      }
    }
  }

  export class ComplexTokenizer {
    public readonly tokens: Util.Arrays.FixedArray<Readonly<Token.Token>>;
    private tokenizer: BasicTokenizer;
    private index: number = 0;

    /**
     * @description The ComplexTokenizer takes in a BasicTokenizer, and comprises elements into tags or text
     * @param basicTokenizer
     */
    constructor(basicTokenizer: BasicTokenizer) {
      this.tokenizer = basicTokenizer;
      this.tokens = this.tokenize();
    }

    private tokenize(): Util.Arrays.FixedArray<Readonly<Token.Token>> {
      const tokens: Token.Token[] = [];

      for (; this.index < this.tokenizer.tokens.length; this.index++) {
        const token = this.tokenizer.tokens[this.index];

        if (token instanceof Token.SimpleToken.XMLOpenTagCharToken) {
          const openXMLTag = this.scanXMLOpenTag();
          tokens.push(openXMLTag);
        } else if (token instanceof Token.SimpleToken.XMLOpenEndTagCharToken) {
          const closeXMLTag = this.scanXMLCloseTag();
          tokens.push(closeXMLTag);
        } else {
          tokens.push(token);
        }
      }

      return new Util.Arrays.FixedArray(...tokens);
    }
    private scanXMLOpenTag(): Token.ComplexToken.XMLOpenTagToken {
      const params: Token.ComplexToken.XMLTagTypes.ParamTuple[] = [];

      console.assert(
        this.tokenizer.tokens[this.index] instanceof
          Token.SimpleToken.XMLOpenTagCharToken,
        `Expected "<" but got ${this.tokenizer.tokens[this.index].value}`
      );

      this.index++; // move off "<"

      const tagName = this.tokenizer.tokens[this.index];

      this.index++; // move off tagname

      for (
        let token = this.tokenizer.tokens[this.index];
        this.index < this.tokenizer.tokens.length;
        token = this.tokenizer.tokens[++this.index]
      ) {
        if (token instanceof Token.SimpleToken.XMLCloseTagCharToken) {
          break;
        }
        if (token instanceof Token.GenericToken.TextToken) {
          // move onto '=' sign
          ++this.index;

          console.assert(
            this.tokenizer.tokens[this.index] instanceof
              Token.GenericToken.TextToken &&
              this.tokenizer.tokens[this.index].value === '=',
            `Expected token "=" for parameter but got ${
              this.tokenizer.tokens[this.index].value
            }`
          );

          ++this.index;

          console.assert(
            this.tokenizer.tokens[this.index] instanceof
              Token.GenericToken.InterpolatedJSToken,
            `Expected interpolated JS on parameter but got something else.`
          );

          const interpolatedJS = this.tokenizer.tokens[
            this.index
          ] as Token.GenericToken.InterpolatedJSToken;

          const paramPair: [
            Token.GenericToken.TextToken,
            Token.GenericToken.InterpolatedJSToken
          ] = [token, interpolatedJS];

          params.push(paramPair);
        } else {
          console.error(
            `Expected a parameter identifier but got ${token.value}`
          );
        }
      }
      return new Token.ComplexToken.XMLOpenTagToken(
        tagName,
        new Util.Arrays.FixedArray(...params)
      );
    }
    private scanXMLCloseTag(): Token.ComplexToken.XMLCloseTagToken {
      console.assert(
        this.tokenizer.tokens[this.index] instanceof
          Token.SimpleToken.XMLOpenEndTagCharToken,
        `Expected ">" but got ${this.tokenizer.tokens[this.index].value}`
      );

      this.index++; // step off <

      const textToken = this.tokenizer.tokens[this.index];

      this.index++; // step onto >

      console.assert(
        this.tokenizer.tokens[this.index] instanceof
          Token.SimpleToken.XMLCloseTagCharToken
      );

      return new Token.ComplexToken.XMLCloseTagToken(textToken);
    }
  }

  export class BasicTokenizer {
    public readonly stream: string;
    public readonly tokens: Util.Arrays.FixedArray<Readonly<Token.Token>>;
    private index: number = 0;
    constructor(stream: string) {
      this.stream = stream;
      this.tokens = this.tokenize(stream);
    }
    private tokenize(
      stream: string
    ): Util.Arrays.FixedArray<Readonly<Token.Token>> {
      // This matches an xml tag <...> (which includes </...>)
      // the lazy is there so that it doesn't pick up multiple xml tags near each other as connected
      // and tries to match as few items before the closing bracket as possible
      // \<.*?\>|
      // this also has the lazy to make sure that interpolated data doesn't get singularified
      // this matches interpolated data, i.e. {this.state.managed}
      // \{.*?\ }|
      // this matches all text that does not start with the patterns above. It's a suspicious implementation but it seems to work

      // then this catches lone openings that aren't caught by the 3rd pattern.
      // ([^\<\>\{\}]+)

      const tokens: Token.Token[] = [];

      for (
        let char = this.stream[this.index];
        this.index < this.stream.length;
        char = this.stream[++this.index]
      ) {
        if (Util.Chars.isAlpha(char)) {
          const text = this.scanValidTagOrParamName();

          tokens.push(new Token.GenericToken.TextToken(text));
        } else if (char === '{') {
          const stringResultInterpolatedJS = this.scanInterpolatedJS();
          const interpolatedJS = new Token.GenericToken.InterpolatedJSToken(
            stringResultInterpolatedJS
          );

          tokens.push(interpolatedJS);
        } else if (char === '<') {
          if (stream[this.index + 1] === '/') {
            this.index++;
            tokens.push(new Token.SimpleToken.XMLOpenEndTagCharToken());
          } else {
            tokens.push(new Token.SimpleToken.XMLOpenTagCharToken());
          }
        } else if (char === '>') {
          tokens.push(new Token.SimpleToken.XMLCloseTagCharToken());
        } else if (char === '\\') {
          console.assert(
            this.index + 1 < this.stream.length,
            'Assertion failed, escape char has no escaped character at end of input.'
          );
          tokens.push(
            new Token.GenericToken.TextToken(this.stream[++this.index])
          );
        } else if (!Util.Chars.isWhitespace(char)) {
          tokens.push(new Token.GenericToken.TextToken(char));
        }
      }

      return new Util.Arrays.FixedArray(...tokens);
    }

    private scanValidTagOrParamName() {
      let name = '';

      for (
        let char = this.stream[this.index];
        this.index < this.stream.length;
        char = this.stream[++this.index]
      ) {
        if (Util.Chars.isAlpha(char) || char === '-') {
          name += char;
        } else {
          break;
        }
      }

      this.index--; // move back a char to the last char of the identifier

      return name;
    }

    private scanInterpolatedJS() {
      console.assert(
        this.stream[this.index] === '{',
        `Expected {, but got ${this.stream[this.index]}`
      );

      // this holds the content
      let interpolatedJS = '';
      // at 1, it means that the initial { has been seen
      // this manages the nesting {{{{}}}}, etc.
      let nestingLevel = 1;
      // this holds the state of whether or not a string is being scanned because } do not count in strings
      let currentlyScanningString = false;

      for (this.index++; nestingLevel != 0; this.index++) {
        let interpolatedJSCharacter = this.stream[this.index];

        if (!currentlyScanningString)
          if (interpolatedJSCharacter === '{') nestingLevel++;
          else if (interpolatedJSCharacter === '}') nestingLevel--;

        if (!nestingLevel) break;

        if (interpolatedJSCharacter === '"')
          currentlyScanningString = !currentlyScanningString;
        if (this.stream.substr(this.index, 2) === '\\"')
          interpolatedJSCharacter = this.stream[++this.index];

        interpolatedJS += interpolatedJSCharacter;
      }

      return interpolatedJS;
    }
  }
}

export default Tokenize;
