import { Parser } from './parse';

export namespace Compiler {
  export function compile(node: Parser.Node.Node): string {
    if (node instanceof Parser.Node.XMLElementNode) {
      let resultingString = `<${node.token.value} `;

      for (const [key, val] of node.token.params) {
        resultingString += `${key.value}=${val.value}`;
      }

      resultingString += '>';

      for (const child of node.children) {
        resultingString += compile(child);
      }

      resultingString += `</${node.closeToken.value}>`;
      return resultingString;
    } else if (node instanceof Parser.Node.ChildlessNode.InterpolatedJSNode) {
      const result = eval(node.token.value);
      return result;
    } else if (node instanceof Parser.Node.ChildlessNode.TextNode) {
      return node.token.value;
    } else {
      throw new Error(`Unknown node type ${node.constructor.name}`);
    }
  }
  export function domify(node: Parser.Node.Node) {
    if (node instanceof Parser.Node.XMLElementNode) {
      const e = document.createElement(node.token.value);

      for (const [key, value] of node.token.params) {
        e.setAttribute(key.value, value.value);
      }

      for (const child of node.children) {
        e.appendChild(domify(child));
      }

      return e;
    } else if (node instanceof Parser.Node.ChildlessNode.TextNode) {
      const e = document.createElement('span');
      e.innerText = node.token.value;
      return e;
    } else if (node instanceof Parser.Node.ChildlessNode.InterpolatedJSNode) {
      const e = document.createElement('span');
      e.innerText = node.token.value;
      return e;
    } else {
      throw new Error(`Unknown node.`);
    }
  }
}
