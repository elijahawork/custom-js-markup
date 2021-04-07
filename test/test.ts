// import * as smp from 'source-map-support';
import { Compiler } from '../src/compile';
import { Parser } from '../src/parse';
import Tokenize from '../src/tokenize';

// smp.install();

const stream = `
<html>
  <nav id = {"main-nav"}>
    <ul>
      <li id={"home"}>
        <button>
          Home
        </button>
      </li>
      <li id = {"abc" }>
        <button>
          Contact
        </button>
      </li>
      <li>
        <button>
          About Us
        </button>
      </li>
    </ul>
  </nav>
</html>
`;
const tokenizer = new Tokenize.BasicTokenizer(stream);

const complexTokenizer = new Tokenize.ComplexTokenizer(tokenizer);

const parser = new Parser.Parser(complexTokenizer);

const compiledDOM = Compiler.domify(parser.resultingBody);

console.log(compiledDOM)