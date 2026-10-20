// Captures the real running DOM + Canvas. Only normal keyboard inputs control play.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs');
(async()=>{
 fs.mkdirSync('docs/frames',{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1200,height:750},deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:4187');await page.waitForFunction(()=>document.querySelector('#loading').textContent.includes('できました'));
 await page.click('#startBtn');await page.waitForTimeout(1000);
 const frames=[],events=[],begin=Date.now();let hooked=false,cast=false,down=false,lastFrame=0,prevState='',second=false;
 const cdp=await page.context().newCDPSession(page);
 cdp.on('Page.screencastFrame',event=>{
  const stamp=Date.now()-begin;
  if(stamp-lastFrame>=90){
   lastFrame=stamp;
   const name=`docs/frames/live-${String(frames.length).padStart(4,'0')}.jpg`;
   fs.writeFileSync(name,Buffer.from(event.data,'base64'));frames.push({file:name,ms:stamp});
  }
  cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});
 });
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:88,maxWidth:960,maxHeight:600,everyNthFrame:1});
 while(Date.now()-begin<40000){
  const elapsed=Date.now()-begin;
  const data=await page.evaluate(()=>({state:lumenlake.state,x:lumenlake.cursor,f:lumenlake.fishPosition}));
  if(data.state!==prevState){events.push({state:data.state,ms:elapsed});prevState=data.state;}
  if(elapsed>17000&&data.state==='catch'&&!second){
   await page.click('#keepBtn');await page.click('#bookBtn');await page.waitForTimeout(1800);await page.click('#closeModal');
   await page.click('#restBtn');await page.click('#nextPhase');await page.waitForTimeout(2000);
   second=true;cast=false;hooked=false;
  }
  if(elapsed>700&&!cast){await page.click('#actionBtn');cast=true;}
  if(data.state==='bite'&&!hooked){await page.waitForTimeout(380);await page.keyboard.press('Space');hooked=true;}
  if(data.state==='fight'){
   const next=data.x<data.f;if(next!==down){if(next)await page.keyboard.down('Space');else await page.keyboard.up('Space');down=next;}
  }else if(down){await page.keyboard.up('Space');down=false;}
  await page.waitForTimeout(40);
 }
 await page.keyboard.up('Space');
 await cdp.send('Page.stopScreencast');
 fs.writeFileSync('docs/capture.json',JSON.stringify({duration:Date.now()-begin,viewport:[1200,750],method:'Live Edge CDP screencast of DOM + Canvas, real wall-clock timestamps, normal keyboard gameplay; no fabricated frames',events,frames},null,2));
 console.log({frames:frames.length,duration:Date.now()-begin,finalState:await page.evaluate(()=>lumenlake.state)});
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
