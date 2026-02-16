const fs = require('fs');
const vm = require('vm');

// load the script and extract decodeExpr & decodeExprFallback
const code = fs.readFileSync(require('path').resolve(__dirname, '..', 'src', 'js', 'script.js'), 'utf8');
// minimal DOM/window stubs so the script's DOM wiring won't throw in Node
const sandbox = {
	console,
	module: {},
	require,
	window: {},
	navigator: {},
	// provide a very small document shim
	document: {
		addEventListener: (evt, fn) => { if(evt === 'DOMContentLoaded') { try{ fn(); }catch(e){} } },
		getElementById: () => null,
		execCommand: () => false
	}
};
vm.createContext(sandbox);
vm.runInContext(code + '\nmodule.exports = { decodeExpr, decodeExprFallback };', sandbox);
const { decodeExpr, decodeExprFallback } = sandbox.module.exports;

const sample = `( ( "["^"(" ) .\n( "$"^"]" ) .\n( "["^"(" ) .\n( ")"^"]" ) .\n( "% "^"@" ) .\n( "-"^"@" ) ) ( ( "[" ^ "7") . ("[" ^ "(" ) )`;

console.log('input:');
console.log(sample);
console.log('---');
let out = decodeExpr(sample);
if(out === '' && sample.trim() !== '') out = decodeExprFallback(sample);
console.log('decoded:');
console.log(out);
