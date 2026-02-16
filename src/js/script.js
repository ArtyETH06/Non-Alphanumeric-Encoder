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
  // Tokenize into words (alphanumeric sequences) and single-char tokens
  const tokens = text.match(/[A-Za-z0-9]+|./g) || [];

  const blocks = tokens.map(token => {
    const parts = [];
    for(let i=0;i<token.length;i++){
      const ch = token[i];
      // prefer literal quoted tokens for parentheses so they are always preserved on decode
      if(ch === '(' || ch === ')'){
        parts.push('("'+escapeForExpr(ch)+'")');
        continue;
      }
      if(pairMap[ch] && pairMap[ch].length>0){
        const p = pairMap[ch][0];
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

  // join token blocks with PHP concatenation operator so resulting string is valid PHP
  return blocks.join(' . ');
}

function escapeForExpr(ch){
  if(ch === '\\') return '\\\\';
  if(ch === '"') return '\\"';
  return ch;
}

function decodeExpr(expr){
  // Robust regex-based parser: scan the whole expression for quoted tokens
  // and XOR pairs in order, ignoring whitespace/parentheses/dot separators.
  const re = /"((?:\\.|[^"\\])*)"\s*\^\s*"((?:\\.|[^"\\])*)"|"((?:\\.|[^"\\])*)"/g;
  let m; const out = [];
  while((m = re.exec(expr)) !== null){
    if(m[1] !== undefined && m[2] !== undefined && m[1] !== ''){
      const a = unescapeFromExpr(m[1]);
      const b = unescapeFromExpr(m[2]);
      if(a.length === b.length){
        for(let k=0;k<a.length;k++) out.push(String.fromCharCode(a.charCodeAt(k) ^ b.charCodeAt(k)));
      } else {
        // XOR up to min length. If one side has a short remainder that is only spaces,
        // treat it as an encoding artifact and ignore it (fixes cases like "% "^"@" -> extra space).
        const minLen = Math.min(a.length, b.length);
        for(let k=0;k<minLen;k++) out.push(String.fromCharCode(a.charCodeAt(k) ^ b.charCodeAt(k)));
        const remA = a.slice(minLen);
        const remB = b.slice(minLen);
        // ignore remainders that are purely whitespace
        const isBlankA = remA === '' || /^\s+$/.test(remA);
        const isBlankB = remB === '' || /^\s+$/.test(remB);
        if(!isBlankA && remA !== '') out.push(remA);
        if(!isBlankB && remB !== '') out.push(remB);
      }
    } else if(m[3] !== undefined){
      out.push(unescapeFromExpr(m[3]));
    }
  }
  return out.join('');
}

// Fallback regex parser (keeps previous behavior) in case sequential parse produced nothing
function decodeExprFallback(expr){
  // Keep a fallback that mirrors the robust behavior (handles multi-char pairs)
  const re = /"((?:\\.|[^"\\])*)"\s*\^\s*"((?:\\.|[^"\\])*)"|"((?:\\.|[^"\\])*)"/g;
  let m; const out = [];
  while((m = re.exec(expr)) !== null){
    if(m[1] !== undefined && m[2] !== undefined && m[1] !== ''){
      const a = unescapeFromExpr(m[1]);
      const b = unescapeFromExpr(m[2]);
      if(a.length === b.length){
        for(let k=0;k<a.length;k++) out.push(String.fromCharCode(a.charCodeAt(k) ^ b.charCodeAt(k)));
      } else {
        const minLen = Math.min(a.length, b.length);
        for(let k=0;k<minLen;k++) out.push(String.fromCharCode(a.charCodeAt(k) ^ b.charCodeAt(k)));
        if(a.length > minLen) out.push(a.slice(minLen));
        if(b.length > minLen) out.push(b.slice(minLen));
      }
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
  const variantsPanel = document.getElementById('variants-panel');
  const variantsList = document.getElementById('variants-list');
  const genVariantsBtn = document.getElementById('gen-variants');
  const prefLiteralsChk = document.getElementById('pref-literals');
  const magicBtn = document.getElementById('magic-variant');

  // mode: 'encode' or 'decode'
  let mode = 'encode';

  function runTransform() {
    if(!input || !output) return;
    const v = input.value || '';
    if(mode === 'encode') {
      output.value = encode(v);
    } else {
  const decoded = decodeExpr(v);
  output.value = (decoded === '' && v.trim() !== '') ? decodeExprFallback(v) : decoded;
    }
  }

  // generate multiple variants for the current input and show them in the variants panel
  function generateVariants(text, count=6, preferLiterals=false){
    // deterministic pseudo-random based on index to keep variants stable per generation
    function prng(seed){
      let s = seed >>> 0;
      return function(){ s = Math.imul(48271, s) % 0x7fffffff; return s / 0x7fffffff; };
    }

    const variants = [];
    for(let v=0; v<count; v++){
      const rnd = prng(1000 + v);
      // make a variant by walking tokens and sometimes choosing pair or literal
      const tokens = text.match(/[A-Za-z0-9]+|./g) || [];
      const blocks = tokens.map(token => {
        const parts = [];
        for(let i=0;i<token.length;i++){
          const ch = token[i];
          if(ch === '(' || ch === ')'){
            parts.push('("'+escapeForExpr(ch)+'")');
            continue;
          }
          const candidates = pairMap[ch] || null;
          const useLiteral = preferLiterals || (rnd() < 0.25) || !candidates;
          if(!useLiteral && candidates && candidates.length>0){
            const p = candidates[Math.floor(rnd()*candidates.length)];
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
      variants.push(blocks.join(' . '));
    }
    return variants;
  }

  function renderVariants(list){
    variantsList.innerHTML = '';
    list.forEach((v, idx) =>{
      const item = document.createElement('div');
      item.className = 'variant-item';
      const pre = document.createElement('pre'); pre.textContent = v;
      const btn = document.createElement('button'); btn.className='btn-variant'; btn.textContent = 'Use';
      btn.addEventListener('click', ()=>{ output.value = v; });
      item.appendChild(pre); item.appendChild(btn);
      variantsList.appendChild(item);
    });
  }

  // precomputed magic variants and index
  let magicVariants = [];
  let magicIndex = 0;
  function ensureMagic(text){
    magicVariants = generateVariants(text, 6, prefLiteralsChk ? prefLiteralsChk.checked : false);
    magicIndex = 0;
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

  if(genVariantsBtn && variantsList){
    genVariantsBtn.addEventListener('click', ()=>{
      const text = input ? (input.value || '') : '';
      const prefer = prefLiteralsChk ? prefLiteralsChk.checked : false;
      const vars = generateVariants(text, 6, prefer);
      renderVariants(vars);
      // also refresh magic list
      ensureMagic(text);
    });
  }

  if(magicBtn){
    magicBtn.addEventListener('click', ()=>{
      const text = input ? (input.value || '') : '';
      if(!text) return;
      if(magicVariants.length === 0) ensureMagic(text);
      output.value = magicVariants[magicIndex % magicVariants.length];
      magicIndex++;
    });
  }

  // initial run
  runTransform();
});
