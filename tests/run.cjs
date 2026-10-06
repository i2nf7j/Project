const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const [mode='all',...selected]=process.argv.slice(2),root=path.resolve(__dirname,'..');
if(!['all','model','browser'].includes(mode)||selected.length&&mode!=='browser'){
  console.error('Usage: node tests/run.cjs all|model|browser [name.browser.cjs ...]');process.exit(2);
}
const files=fs.readdirSync(__dirname).sort();
// staffing.browser.cjs is a compatibility alias for operations.browser.cjs.
let browsers=files.filter(f=>f.endsWith('.browser.cjs')&&f!=='staffing.browser.cjs');
if(selected.length){
  if(selected.some(f=>!browsers.includes(f))){console.error('Unknown browser test:',selected.join(', '));process.exit(2);}
  browsers=selected;
}
let failures=0;
function run(label,args,timeout){
  console.log('\nRUN '+label);
  const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',timeout});
  if(result.error||result.status!==0){failures++;console.error('FAIL '+label+': '+(result.error?.message||'exit '+result.status));}
}
if(mode!=='browser')run('model/environment',['--test',...files.filter(f=>f.endsWith('.test.cjs')).map(f=>'tests/'+f)],60000);
if(mode!=='model')for(const file of browsers)run(file,['tests/'+file],120000);
console.log('\n'+(failures?failures+' test command(s) failed.':'All selected test commands passed.'));
process.exitCode=failures?1:0;
