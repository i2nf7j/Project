const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');

async function launchBrowser(){
  fs.mkdirSync(path.resolve(__dirname,'../tmp/test-results'),{recursive:true});
  const options={headless:true};
  if(process.env.TEST_BROWSER_PATH)options.executablePath=process.env.TEST_BROWSER_PATH;
  else if(process.env.PLAYWRIGHT_CHANNEL)options.channel=process.env.PLAYWRIGHT_CHANNEL;
  return chromium.launch(options);
}
module.exports={launchBrowser};
