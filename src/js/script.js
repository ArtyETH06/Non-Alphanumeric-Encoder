/* Live encoder/decoder for non-alphanumeric XOR trick
   Strategy:
   - Precompute all printable ASCII characters (32..126) that are non-alphanumeric.
   - For every pair (c1, c2) of those, compute chr(ord(c1)^ord(c2)). If results in desired target char,
     we can represent the target as '"c1" ^ "c2"'.
   - Encoder: for each character in input, pick the first matching pair.
   - Decoder: evaluate a simple parser that extracts pairs like ("x"^"y") and computes XOR back to chars,
     and concatenates strings joined by dot operator (.) which is PHP concatenation.
*/

const PRINTABLE_START = 32;
const PRINTABLE_END = 126;

function isAlpha(c){ return /[A-Za-z]/.test(c); }

// build list of non-alphanumeric printable chars
const nonAlpha = [];
for(let i=PRINTABLE_START;i<=PRINTABLE_END;i++){
  const ch = String.fromCharCode(i);
  if(!isAlpha(ch)) nonAlpha.push(ch);
}

// map: char -> [pair]
const pairMap = {};
for(let i=0;i<nonAlpha.length;i++){
  for(let j=0;j<nonAlpha.length;j++){
    const a = nonAlpha[i];
    const b = nonAlpha[j];
    const res = String.fromCharCode(a.charCodeAt(0) ^ b.charCodeAt(0));
    if(!pairMap[res]) pairMap[res] = [];
    pairMap[res].push([a,b]);
  }
}

function encode(text){
  const parts = [];
  for(const ch of text){
    if(pairMap[ch] && pairMap[ch].length>0){
      const p = pairMap[ch][0];
      // produce a short expression: ("a"^"b")
      parts.push('("'+escapeForExpr(p[0])+'"^"'+escapeForExpr(p[1])+'")');
    } else {
      // fallback: placeholder
      parts.push('"?"');
    }
  }
  return parts.join(' . ');
}

function escapeForExpr(ch){
  if(ch === '\\') return '\\\\';
  if(ch === '"') return '\\"';
  return ch;
}

function decodeExpr(expr){
  const re = /\"(.*?)\"\s*\^\s*\"(.*?)\"/g;
  let m; const out = [];
  while((m = re.exec(expr)) !== null){
    const a = unescapeFromExpr(m[1]);
    const b = unescapeFromExpr(m[2]);
    out.push(String.fromCharCode(a.charCodeAt(0) ^ b.charCodeAt(0)));
  }
  return out.join('');
}

function unescapeFromExpr(s){
  return s.replace(/\\\"/g,'"').replace(/\\\\/g,'\\');
}

// DOM wiring
document.addEventListener('DOMContentLoaded', ()=>{
  const input = document.getElementById('input');
  const output = document.getElementById('output');
  const copyBtn = document.getElementById('copy');
  const toggle = document.getElementById('mode-toggle');
  const toolTitle = document.getElementById('tool-title');

  // mode: 'encode' or 'decode'
  let mode = 'encode';

  function runTransform() {
    if(!input || !output) return;
    const v = input.value || '';
    if(mode === 'encode') {
      output.value = encode(v);
    } else {
      output.value = decodeExpr(v);
    }
  }

  // live encode while typing
  if(input){
    input.addEventListener('input', ()=>{
      // run transform in real-time for encode mode; for decode also update live
      runTransform();
    });
  }

  if(copyBtn && output){
    copyBtn.addEventListener('click', ()=>{
      output.select();
      document.execCommand('copy');
    });
  }

  if(toggle && toolTitle){
    toggle.addEventListener('click', ()=>{
      mode = (mode === 'encode') ? 'decode' : 'encode';
      toolTitle.textContent = mode === 'encode' ? 'Encode' : 'Decode';
      // rotate toggle visually
      toggle.classList.toggle('rotate');
      // rerun transform immediately
      runTransform();
    });
  }

  // initial run
  runTransform();
});
