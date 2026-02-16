const fs = require('fs');
const vm = require('vm');
const path = require('path');

const code = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'js', 'script.js'), 'utf8');
const sandbox = {
  console,
  module: {},
  require,
  window: {},
  navigator: {},
  document: { addEventListener: (evt, fn) => { if(evt === 'DOMContentLoaded') { try{ fn(); }catch(e){} } }, getElementById: () => null, execCommand: () => false }
};
vm.createContext(sandbox);
vm.runInContext(code + '\nmodule.exports = { decodeExpr, decodeExprFallback };', sandbox);
const { decodeExpr, decodeExprFallback } = sandbox.module.exports;

const sample = process.argv.slice(2).join(' ') || `( ( "["^"(" ) .\n( "$"^"]" ) .\n( "["^"(" ) .\n( ")"^"]" ) .\n( "% "^"@" ) .\n( "-"^"@" ) ) ( ( "[" ^ "7") . ("[" ^ "(" ) )`;

console.log('input:');
console.log(sample);
console.log('---');
let out = decodeExpr(sample);
if(out === '' && sample.trim() !== '') out = decodeExprFallback(sample);
console.log('decoded:');
console.log(out);
