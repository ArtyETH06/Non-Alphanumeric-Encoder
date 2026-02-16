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
const { decodeExpr } = sandbox.module.exports;

const sample = process.argv.slice(2).join(' ') || `( ( "["^"(" ) .\n( "$"^"]" ) .\n( "["^"(" ) .\n( ")"^"]" ) .\n( "% "^"@" ) .\n( "-"^"@" ) ) ( ( "[" ^ "7") . ("[" ^ "(" ) )`;

console.log('INPUT:');
console.log(sample);
console.log('\n--- regex matches and decoded pieces ---');

const re = /"((?:\\.|[^"\\])*)"\s*\^\s*"((?:\\.|[^"\\])*)"|"((?:\\.|[^"\\])*)"/g;
let m; let idx = 0;
function unescapeFromExpr(s){ return s.replace(/\\"/g,'"').replace(/\\\\/g,'\\'); }
while((m = re.exec(sample)) !== null){
  idx++;
  console.log('\nmatch', idx, ':', JSON.stringify(m));
  if(m[1] !== undefined && m[2] !== undefined && m[1] !== ''){
    const a = unescapeFromExpr(m[1]);
    const b = unescapeFromExpr(m[2]);
    console.log('  pair a=', JSON.stringify(a), 'b=', JSON.stringify(b));
    const minLen = Math.min(a.length, b.length);
    let out = '';
    for(let k=0;k<minLen;k++) out += String.fromCharCode(a.charCodeAt(k) ^ b.charCodeAt(k));
    if(a.length>minLen) out += a.slice(minLen);
    if(b.length>minLen) out += b.slice(minLen);
    console.log('  -> decoded piece:', JSON.stringify(out));
  } else if(m[3] !== undefined){
    const s = unescapeFromExpr(m[3]);
    console.log('  single quoted:', JSON.stringify(s));
  }
}

console.log('\n--- full decode using decodeExpr() ---');
console.log('decoded:', JSON.stringify(decodeExpr(sample)));
