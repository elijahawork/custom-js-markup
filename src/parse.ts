import Tokenize from './tokenize';
import Util from './util';

export namespace Parser {
  export namespace Node {
    export abstract class Node<
      T extends Tokenize.Token.Token = Tokenize.Token.Token
    > {
      public readonly token: T;
      public readonly children: Util.Arrays.FixedArray<Readonly<Node>>;

      constructor(children: Node[], token: T) {
        this.token = token;
        // make the previously mutable array immutable
        this.children = new Util.Arrays.FixedArray(...children);
      }
    }
    export class XMLElementNode extends Node<Tokenize.Token.ComplexToken.XMLOpenTagToken> {
      readonly closeToken: Readonly<Tokenize.Token.ComplexToken.XMLCloseTagToken>;
      // readonly parameters: Map<string, string> = new Map<string, string>();

      constructor(
        children: Node[],
        openToken: Tokenize.Token.ComplexToken.XMLOpenTagToken,
        closeToken: Tokenize.Token.ComplexToken.XMLCloseTagToken
      ) {
        super(children, openToken);
        this.closeToken = closeToken;
      }
    }
    export namespace ChildlessNode {
      export class InterpolatedJSNode extends Node {
        constructor(
          interpolatedJSToken: Tokenize.Token.GenericToken.InterpolatedJSToken
        ) {
          super([], interpolatedJSToken);
        }
      }
      export class TextNode extends Node {
        constructor(textToken: Tokenize.Token.GenericToken.TextToken) {
          super([], textToken);
        }
      }
    }
  }

  export class Parser {
    private readonly tokenizer: Tokenize.ComplexTokenizer;
    private index: number = 0;
    public readonly resultingBody: Node.Node;

    constructor(tokenizer: Tokenize.ComplexTokenizer) {
      this.tokenizer = tokenizer;
      this.resultingBody = this.parse();
    }

    private parse(): Node.Node {
      const beginningToken = this.tokenizer.tokens[this.index];

      if (
        beginningToken instanceof Tokenize.Token.ComplexToken.XMLOpenTagToken
      ) {
        const children: Node.Node[] = [];

        this.index++;

        const onClosingTag =
          this.tokenizer.tokens[this.index] instanceof
          Tokenize.Token.ComplexToken.XMLCloseTagToken;

        if (onClosingTag) {
          const closingTag = this.tokenizer.tokens[this.index];
          const closingTagMatchesOpenTag =
            closingTag.value !== beginningToken.value;

          if (closingTagMatchesOpenTag) {
            throw new Error(`Unmatched closing tag ${closingTag.value}`);
          }
        } else {
          for (; this.index < this.tokenizer.tokens.length; this.index++) {
            if (
              this.tokenizer.tokens[this.index] instanceof
                Tokenize.Token.ComplexToken.XMLCloseTagToken &&
              this.tokenizer.tokens[this.index].value === beginningToken.value
            )
              break;
            children.push(this.parse());
          }
        }

        const endingToken = this.tokenizer.tokens[this.index];

        return new Node.XMLElementNode(children, beginningToken, endingToken);
      } else if (
        beginningToken instanceof Tokenize.Token.ComplexToken.XMLCloseTagToken
      ) {
        throw new Error(`Unmatched XMLCloseTagToken ${beginningToken.value}`);
      } else if (
        beginningToken instanceof
        Tokenize.Token.GenericToken.InterpolatedJSToken
      ) {
        return new Node.ChildlessNode.InterpolatedJSNode(beginningToken);
      } else if (
        beginningToken instanceof Tokenize.Token.GenericToken.TextToken
      ) {
        return new Node.ChildlessNode.TextNode(beginningToken);
      } else {
        throw new Error(
          `Unknown token ${this.tokenizer.tokens[this.index].value}`
        );
      }
    }
  }
}
