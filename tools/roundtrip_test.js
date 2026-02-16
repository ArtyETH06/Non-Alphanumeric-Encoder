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
vm.runInContext(code + '\nmodule.exports = { encode, decodeExpr, decodeExprFallback };', sandbox);
const { encode, decodeExpr, decodeExprFallback } = sandbox.module.exports;

const src = 'system(ls)';
const enc = encode(src);
console.log('original:', src);
console.log('encoded:\n', enc);
let dec = decodeExpr(enc);
if(dec === '' && enc.trim() !== '') dec = decodeExprFallback(enc);
console.log('decoded:', dec);
console.log('match:', dec === src);
