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
vm.runInContext(code + '\nmodule.exports = { pairMap, escapeForExpr };', sandbox);
const { pairMap, escapeForExpr } = sandbox.module.exports;

function randChoice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function makeEncoding(text, preferLiterals=false){
  const tokens = text.match(/[A-Za-z0-9]+|./g) || [];
  const blocks = tokens.map(token => {
    const parts = [];
    for(let i=0;i<token.length;i++){
      const ch = token[i];
      // allow forcing parentheses as literal to preserve them
      if(ch === '(' || ch === ')'){
        parts.push('("'+escapeForExpr(ch)+'")');
        continue;
      }
      const candidates = pairMap[ch] || null;
      // occasionally use a literal even if pairs exist, for variety
      const useLiteral = preferLiterals || (Math.random() < 0.25) || !candidates;
      if(!useLiteral && candidates && candidates.length>0){
        const p = randChoice(candidates);
        parts.push('("'+escapeForExpr(p[0])+'"^"'+escapeForExpr(p[1])+'")');
      } else {
        parts.push('("'+escapeForExpr(ch)+'")');
      }
    }
    const lines = parts.map((expr, idx) => {
      const dot = (idx < parts.length - 1) ? ' .' : '';
      return '  ' + expr + dot;
    });
    return '( ' + '\n' + lines.join('\n') + '\n' + ' )';
  });
  return blocks.join(' . ');
}

const input = process.argv.slice(2).join(' ') || 'system(ls)';
const count = 8;
console.log('Original:', input);
console.log('\nGenerated variants:\n');
for(let i=0;i<count;i++){
  const enc = makeEncoding(input, i%4===0); // every 4th variant prefers literals
  console.log('--- variant', i+1, '---');
  console.log(enc + '\n');
}
