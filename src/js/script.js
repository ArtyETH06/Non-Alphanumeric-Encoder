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
  // Tokenize into words (alphanumeric sequences) and single-char tokens (punctuation, spaces)
  const tokens = [];
  let cur = '';
  for(const ch of text){
    if(/[A-Za-z0-9]/.test(ch)){
      cur += ch;
    } else {
      if(cur.length) { tokens.push({type:'word', val:cur}); cur = ''; }
      tokens.push({type:'char', val:ch});
    }
  }
  if(cur.length) tokens.push({type:'word', val:cur});

  function encChar(ch){
    if(pairMap[ch] && pairMap[ch].length>0){
      const p = pairMap[ch][0];
      return '("'+escapeForExpr(p[0])+'"^"'+escapeForExpr(p[1])+'")';
    }
    return '"'+escapeForExpr(ch)+'"';
  }

  function prettyJoin(parts, perLine=6, indent='  '){
    if(parts.length === 0) return '';
    if(parts.length <= perLine) return parts.join(' . ');
    const lines = [];
    for(let i=0;i<parts.length;i+=perLine){
      lines.push(indent + parts.slice(i,i+perLine).join(' . '));
    }
    return lines.join('\n');
  }

  const blocks = tokens.map(token => {
    const chars = token.val.split('');
    const parts = chars.map(c => encChar(c));
    const inner = prettyJoin(parts, 6, '  ');
    return '(\n' + (inner ? inner + '\n' : '') + ')';
  });

  // Join blocks with a blank line for clearer structure
  return blocks.join('\n\n');
}

function escapeForExpr(ch){
  if(ch === '\\') return '\\\\';
  if(ch === '"') return '\\"';
  return ch;
}

function decodeExpr(expr){
  // Match either "a" ^ "b" pairs or plain quoted "c" fallbacks.
  const re = /"((?:\\.|[^"\\])*)"\s*\^\s*"((?:\\.|[^"\\])*)"|"((?:\\.|[^"\\])*)"/g;
  let m; const out = [];
  while((m = re.exec(expr)) !== null){
    if(m[1] !== undefined && m[2] !== undefined && m[1] !== ''){
      const a = unescapeFromExpr(m[1]);
      const b = unescapeFromExpr(m[2]);
      out.push(String.fromCharCode(a.charCodeAt(0) ^ b.charCodeAt(0)));
    } else if(m[3] !== undefined){
      out.push(unescapeFromExpr(m[3]));
    }
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
      // copy output text
      output.select();
      document.execCommand('copy');
      // give visual feedback
      copyBtn.classList.add('copied');
      const prev = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(()=>{
        copyBtn.classList.remove('copied');
        copyBtn.textContent = prev;
        try{ window.getSelection().removeAllRanges(); }catch(e){}
      }, 1000);
    });
  }

  if(toggle && toolTitle){
    toggle.addEventListener('click', ()=>{
      // if there is content in either field, swap them when toggling
      const vIn = input ? (input.value || '') : '';
      const vOut = output ? (output.value || '') : '';
      if((vIn && vIn.trim()!=='') || (vOut && vOut.trim()!=='') ){
        // swap values
        if(input && output){
          const tmp = input.value;
          input.value = output.value;
          output.value = tmp;
        }
      }
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
