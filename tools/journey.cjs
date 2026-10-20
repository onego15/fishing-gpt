// Full progression test uses UI actions and reads diagnostic state; no state injection.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4187');await page.click('#startBtn');
 const began=Date.now(),log=[];
 for(let attempt=0;attempt<40;attempt++){
  let s=await page.evaluate(()=>lumenlake.save);
  if(s.complete)break;
  if(s.rod<2&&s.coins>=[60,110][s.rod]){
   await page.click('#shopBtn');await page.click('#buyRod');await page.click('#closeModal');s=await page.evaluate(()=>lumenlake.save);
  }
  const count=Object.keys(s.fish).length,phase=Math.floor(s.time/180)%3;
  let shouldRest=false;
  if(count>=6&&s.rod>=2)shouldRest=phase!==1;
  else if(phase===0)shouldRest=!!(s.fish.amber&&s.fish.jade&&s.fish.veil);
  else if(phase===1)shouldRest=!!(s.fish.moon&&s.fish.star);
  else shouldRest=!!s.fish.sun;
  if(shouldRest){await page.click('#restBtn');await page.click('#nextPhase');}
  await page.click('#actionBtn');
  await page.waitForFunction(()=>lumenlake.state==='bite',{},{timeout:10000});
  await page.keyboard.press('Space');
  const fightStart=Date.now();let down=false;
  while(Date.now()-fightStart<30000){
   const d=await page.evaluate(()=>({s:lumenlake.state,x:lumenlake.cursor,f:lumenlake.fishPosition}));
   if(d.s!=='fight')break;
   const next=d.x<d.f;if(next!==down){if(next)await page.keyboard.down('Space');else await page.keyboard.up('Space');down=next;}
   await page.waitForTimeout(40);
  }
  await page.keyboard.up('Space');
  const won=await page.evaluate(()=>lumenlake.state==='catch');
  if(!won)throw new Error('Fishing failed at attempt '+attempt);
  log.push(await page.evaluate(()=>({fish:lumenlake.fish,save:lumenlake.save})));
  await page.click('#keepBtn');
  if(await page.locator('#continueBtn').count()){await page.screenshot({path:'docs/ending.png'});await page.click('#continueBtn');}
 }
 const result=await page.evaluate(()=>lumenlake.save);
 if(!result.complete)throw new Error('Ending not reached');
 await page.click('#shopBtn');
 if(await page.locator('#buyCharm').isEnabled()){await page.click('#buyCharm');}
 await page.click('#closeModal');
 // Missed bite and abandoned cast must return to idle, without any penalty.
 await page.click('#actionBtn');await page.waitForTimeout(9000);
 if(await page.evaluate(()=>lumenlake.state)!=='idle')throw new Error('Missed-bite recovery failed');
 await page.click('#actionBtn');await page.keyboard.press('Escape');
 if(await page.evaluate(()=>lumenlake.state)!=='idle')throw new Error('Escape recovery failed');
 await page.click('#bookBtn');await page.screenshot({path:'docs/complete-journal.png'});
 fs.writeFileSync('docs/journey-results.json',JSON.stringify({browser:browser.version(),elapsedSeconds:(Date.now()-began)/1000,errors,result,log,checks:['full unmodified progression','two rod upgrades','six species gate','legendary encounter','ending','charm purchase','missed bite recovery','escape cancel']},null,2));
 console.log(JSON.stringify({elapsed:(Date.now()-began)/1000,result,errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
