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
      // fallback: encode as chr() style using decimal XOR with two non-alpha bytes
      // but for simplicity, if no pair exists, use PHP chr() (which uses digits -> alnum -> blocked by regex),
      // so we instead output a placeholder
      parts.push('"?"');
    }
  }
  return parts.join(' . ');
}

function escapeForExpr(ch){
  // escape backslash and double quote for inclusion in "..."
  if(ch === '\\') return '\\\\';
  if(ch === '"') return '\\"';
  return ch;
}

function decodeExpr(expr){
  // simple parser: find all occurrences of "x"^"y" or ("x"^"y") and compute xor
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
  // convert escaped sequences produced by escapeForExpr
  return s.replace(/\\"/g,'"').replace(/\\\\/g,'\\');
}

// DOM wiring
document.addEventListener('DOMContentLoaded', ()=>{
  const plain = document.getElementById('plain');
  const payload = document.getElementById('payload');
  const encodeBtn = document.getElementById('encode');
  const copyBtn = document.getElementById('copy');
  const raw = document.getElementById('raw');
  const decoded = document.getElementById('decoded');
  const decodeBtn = document.getElementById('decode');
  const example = document.getElementById('example');

  encodeBtn.addEventListener('click', ()=>{
    const txt = plain.value || '';
    const p = encode(txt);
    payload.value = p;
    example.textContent = p;
  });

  copyBtn.addEventListener('click', ()=>{
    payload.select();
    document.execCommand('copy');
  });

  decodeBtn.addEventListener('click', ()=>{
    decoded.value = decodeExpr(raw.value || '');
  });
});
