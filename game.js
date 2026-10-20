'use strict';
(() => {
const $ = id => document.getElementById(id);
const canvas = $('world'), ctx = canvas.getContext('2d', {alpha:false});
const FISH = [
 {id:'amber',name:'琥珀のコハクブナ',short:'コハクブナ',color:'#e4ad60',accent:'#fff1b7',size:18,price:14,rarity:'COMMON',phases:[0,1,2],weather:'any',speed:.72,amp:.22,kind:'calm',hint:'ゆっくり、ゆらゆら。',desc:'夕陽のかけらを鱗にしまう、小さな湖の案内人。'},
 {id:'jade',name:'翡翠のハス',short:'ヒスイハス',color:'#68c6ae',accent:'#d0f1cf',size:27,price:20,rarity:'UNCOMMON',phases:[0,2],weather:'any',speed:1.1,amp:.28,kind:'wave',hint:'大きな波を描いて泳ぐ。',desc:'透きとおるひれが、湖に残された緑の記憶を映す。'},
 {id:'veil',name:'薄暮のベールフィン',short:'ベールフィン',color:'#bda4d8',accent:'#f6daf3',size:22,price:24,rarity:'UNCOMMON',phases:[0],weather:'any',speed:.86,amp:.32,kind:'dart',hint:'静止したあと、すっと跳ねる。',desc:'日と夜が触れ合う、ほんの短い時間だけ姿を見せる。'},
 {id:'moon',name:'月灯りのウオ',short:'ツキアカリウオ',color:'#82bde3',accent:'#e5f6fa',size:32,price:30,rarity:'RARE',phases:[1],weather:'any',speed:1.25,amp:.32,kind:'wave',hint:'月の満ち欠けのような往復。',desc:'月を見上げて泳ぐ。その光は深い水底まで届く。'},
 {id:'rain',name:'雨詠みのナマズ',short:'アメヨミナマズ',color:'#98a4bd',accent:'#d7e0ed',size:38,price:32,rarity:'RARE',phases:[0,1,2],weather:'rain',speed:.8,amp:.34,kind:'dart',hint:'急な切り返しに気をつけて。',desc:'雨音を歌として聴く。ひげに小さな雫を宿している。'},
 {id:'sun',name:'朝焼けのニジマス',short:'アサヤケニジマス',color:'#e99c96',accent:'#ffe0b1',size:35,price:28,rarity:'RARE',phases:[2],weather:'any',speed:1.4,amp:.3,kind:'wave',hint:'軽やかで速い、朝の泳ぎ。',desc:'新しい一日の色をまとい、光の筋を追いかける。'},
 {id:'star',name:'星屑のリュウキン',short:'ホシクズリュウキン',color:'#dec77e',accent:'#fff8d1',size:24,price:38,rarity:'EPIC',phases:[1,2],weather:'clear',speed:1.5,amp:.34,kind:'dart',hint:'小刻みな動きの先を読む。',desc:'流れ星の落としもの。尾びれから金色の砂がこぼれる。'},
 {id:'guardian',name:'星凪の主・ルーメン',short:'ルーメン',color:'#a4e4d6',accent:'#ffedb5',size:88,price:120,rarity:'LEGENDARY',phases:[1],weather:'any',speed:1.35,amp:.36,kind:'lord',hint:'長い旅の最後。落ち着いて追おう。',desc:'夜を忘れた湖が、ずっと待っていた星の記憶。'}
];
const fresh = () => ({version:1,coins:0,rod:0,charm:0,fish:{},time:0,catches:0,complete:false});
let save = fresh(), storageOK=true;
try {const s=JSON.parse(localStorage.getItem('lumenlake-v1'));if(s&&s.version===1&&typeof s.fish==='object'){save={...fresh(),...s};save.time=Math.max(0,Number(save.time)||0);save.coins=Math.max(0,Number(save.coins)||0);save.rod=Math.max(0,Math.min(2,Number(save.rod)||0));}}catch{}
let state='intro', t=0,last=0,wait=0,bite=0,held=false,fish=null,progress=0,cursor=.5,fishPos=.5,fightTime=0,missTime=0;
let modalOpen=false,previousFocus=null,lastPhase=-1,lastWeather='',toastTimer,quality=1;
let w=0,h=0,dpr=1,scale=1,ox=0,oy=0,mouse={x:0,y:0},camera=0,nightBlend=phaseInitial(),dawnBlend=0;
function phaseInitial(){return Math.floor(save.time/180)%3===1?1:0;}
const particles=[],rings=[];
const bg = new Image(); bg.src='assets/lake.png';
bg.onload=()=>{$('loading').textContent='湖の準備ができました';};
bg.onerror=()=>{$('loading').textContent='背景を読めませんでした。ローカルサーバーから開いてください。';};
const phase=()=>Math.floor(save.time/180)%3;
const raining=()=>Math.floor(save.time/85)%3===1;
const unique=()=>Object.keys(save.fish).length;
const ready=()=>unique()>=6&&save.rod>=2;
function persist(){try{localStorage.setItem('lumenlake-v1',JSON.stringify(save));}catch{if(storageOK){storageOK=false;toast('保存領域が使えません。このタブ内で遊べます。');}}}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3400);}
function updateUI(){
 $('coins').textContent=save.coins;$('bookCount').textContent=`${unique()}/8`;
 $('questCount').textContent=`魚の記憶 ${Math.min(6,unique())} / 6　·　竿 ${save.rod} / 2`;
 $('questProgress').style.width=`${Math.min(1,(Math.min(unique(),6)+save.rod)/8)*100}%`;
 if(save.complete){$('questTitle').textContent='湖に、星が戻った。';$('questText').innerHTML='あなたの灯りは、湖の記憶に。<br>まだ見ぬ魚との旅を、続けましょう。';}
 else if(ready()){$('questTitle').textContent='星凪の主を探して。';$('questText').innerHTML='夜の湖で、最後のひと投げを。<br>星の主が、あなたを待っています。';}
}
function worldUI(){
 const p=phase(),rain=raining();
 $('phase').textContent=['夕暮れ','星月夜','夜明け'][p];$('phaseIcon').textContent=['◒','☾','☀'][p];
 $('weather').textContent=rain?'小雨 · 雨詠みの魚が訪れる':'晴れ · 水面はおだやか';
 $('day').textContent=`DAY ${String(Math.floor(save.time/540)+1).padStart(2,'0')}`;
 if(lastPhase!==-1&&p!==lastPhase)toast(['夕陽が、湖を琥珀に染める。','星が灯りました。夜の魚が目を覚ます。','朝の光に、新しい魚の気配。'][p]);
 if(lastWeather!==''&&lastWeather!==String(rain))toast(rain?'雨の音。雨詠みのナマズが訪れました。':'雨が上がり、湖に光が戻りました。');
 lastPhase=p;lastWeather=String(rain);
}
let audio=null,sound=false,musicClock=0;
function initSound(){if(!audio){try{audio=new (window.AudioContext||window.webkitAudioContext)();}catch{return;}}audio.resume();sound=true;$('soundLabel').textContent='音 ON';$('soundBtn').setAttribute('aria-pressed','true');}
function note(freq,duration=.3,vol=.035,type='sine',delay=0){
 if(!audio||!sound)return;
 const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime+delay;
 osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(vol,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain).connect(audio.destination);osc.start(now);osc.stop(now+duration+.02);
}
function chime(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>note(f,1,.045,'sine',i*.11));}
function splash(x,y,n=15){rings.push({x,y,life:0});for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*115,vy:-30-Math.random()*100,life:0,max:.6+Math.random()*.6,color:'#c5eee3'});note(180,.15,.04,'triangle');}
function start(){state='idle';$('intro').hidden=true;initSound();worldUI();updateUI();toast(save.catches?'おかえりなさい、灯守。':'SPACE でキャスト。魚がヒットしたら、もう一度 SPACE。');}
function idle(text='ひと投げから、物語がはじまる。'){
 state='idle';held=false;$('fight').hidden=true;$('interaction').hidden=false;$('stateLabel').textContent='A MOMENT OF STILLNESS';$('message').textContent=text;$('actionText').textContent='釣り糸をたらす';$('actionBtn').disabled=false;$('hint').textContent='クリック / SPACE でキャスト';
}
function selectFish(){
 if(ready()&&!save.complete&&phase()===1)return FISH[7];
 const pool=FISH.slice(0,7).filter(f=>f.phases.includes(phase())&&(f.weather==='any'||f.weather===(raining()?'rain':'clear')));
 const unseen=pool.filter(f=>!save.fish[f.id]);
 const list=unseen.length&&Math.random()<.72?unseen:pool;
 return list[Math.floor(Math.random()*list.length)];
}
function action(){
 if(modalOpen||state==='intro')return;
 if(state==='idle'){
  state='casting';wait=.7;fish=selectFish();$('stateLabel').textContent='CASTING INTO THE UNKNOWN';$('message').textContent='小さな光を、水面へ。';$('actionBtn').disabled=true;$('hint').textContent='水面に、魚の気配を待つ';note(480,.2,.025);
 }else if(state==='bite')beginFight();
}
function beginFight(){
 state='fight';fightTime=0;progress=.24;cursor=.5;fishPos=.5;missTime=0;held=false;
 $('interaction').hidden=true;$('fight').hidden=false;$('fishBehavior').textContent=fish.hint;
 splash(790,610,24);note(740,.2,.05);note(980,.35,.04,'sine',.1);
}
function fishMotion(f,time){
 if(f.kind==='dart')return .5+Math.tanh(Math.sin(time*f.speed)) * f.amp + Math.sin(time*3)*.025;
 if(f.kind==='lord')return .5+Math.sin(time*f.speed)*f.amp*.7+Math.sin(time*2.7)*.1;
 return .5+Math.sin(time*f.speed)*f.amp+Math.sin(time*2.1)*.025;
}
function catchFish(){
 const isNew=!save.fish[fish.id],size=Math.round(fish.size*(.85+Math.random()*.4)*10)/10;
 const record=save.fish[fish.id]||{count:0,best:0};record.count++;record.best=Math.max(record.best,size);save.fish[fish.id]=record;
 save.coins+=fish.price;save.catches++;if(fish.id==='guardian')save.complete=true;
 persist();updateUI();state='catch';held=false;$('fight').hidden=true;chime();splash(790,610,50);
 for(let i=0;i<40;i++)particles.push({x:790,y:600,vx:(Math.random()-.5)*200,vy:-60-Math.random()*180,life:0,max:2,color:'#ffe5a0'});
 openModal(`<div class="catchCard"><span class="new">${fish.id==='guardian'?'THE LAKE REMEMBERS':isNew?'NEW DISCOVERY':'A LITTLE TREASURE'}</span><div><canvas id="catchFishArt" width="120" height="60"></canvas></div><span class="eyebrow">${fish.rarity}</span><h2 id="modalTitle">${fish.name}</h2><p>${fish.desc}</p><div class="stats"><div>${size.toFixed(1)}<small>cm · 体長</small></div><div>+ ${fish.price}<small>星のかけら</small></div></div><button id="keepBtn" class="primary">${fish.id==='guardian'?'星を湖に還す':'記憶を図鑑にしまう'} <span>→</span></button><p>${isNew?'新しい魚の記憶が、図鑑に刻まれました。':'魚はそっと湖へ。記憶はあなたの手に。'}</p></div>`);
 drawFish($('catchFishArt'),fish);$('keepBtn').onclick=()=>{const end=fish.id==='guardian';closeModal();if(end)ending();};
}
function ending(){openModal(`<div class="catchCard"><span class="eyebrow">THE END · AND A NEW BEGINNING</span><div class="ornament">✦</div><h2 id="modalTitle">星は、ここにあった。</h2><p>魚たちが集めた小さな記憶は、<br>ひとつ、またひとつと、夜空へ還ってゆく。<br><br>湖はもう、夜を忘れない。<br>あなたが灯した光を、覚えているから。</p><div class="stats"><div>${unique()}<small>出会った魚</small></div><div>${save.catches}<small>釣り上げた記憶</small></div></div><button id="continueBtn" class="primary">湖畔でもう少し過ごす</button></div>`);$('continueBtn').onclick=closeModal;chime();}
function openModal(html){
 if(!modalOpen)previousFocus=document.activeElement;held=false;modalOpen=true;
 $('modalBody').innerHTML=html;$('modal').hidden=false;$('closeModal').focus();
}
function closeModal(){modalOpen=false;$('modal').hidden=true;if(state==='catch')idle('またひとつ、湖の記憶に触れた。');previousFocus?.focus();}
function book(){
 if(!canMenu())return;
 openModal(`<span class="eyebrow">THE FIELD JOURNAL · ${unique()} / 8</span><h2 id="modalTitle">湖の記憶を、集める。</h2><p>魚を見つけた時間と空模様を、そっと書き留める。</p><div class="fishGrid">${FISH.map((f,i)=>`<article class="fishCard ${save.fish[f.id]?'':'locked'}"><canvas id="fish${i}" width="88" height="44"></canvas><span class="rarity">${f.rarity}</span><h3>${save.fish[f.id]?f.short:'まだ見ぬ記憶'}</h3><p>${f.phases.map(p=>['夕暮れ','夜','夜明け'][p]).join('・')} / ${f.weather==='rain'?'雨':f.weather==='clear'?'晴れ':'全天候'}</p><p>${save.fish[f.id]?`${save.fish[f.id].count}匹 · 最大 ${save.fish[f.id].best.toFixed(1)} cm`:f.id==='guardian'?'6種発見 + 竿を2回強化':f.hint}</p></article>`).join('')}</div>`);
 FISH.forEach((f,i)=>drawFish($('fish'+i),f,!save.fish[f.id]));
}
function shop(){
 if(!canMenu())return;
 const costs=[60,110];openModal(`<span class="eyebrow">THE KEEPER'S WORKSHOP</span><h2 id="modalTitle">旅の道具を、ととのえる。</h2><p>星のかけら <b style="color:var(--gold)">${save.coins}</b> ✧　·　魚は売らず、湖へ還します。</p><div class="shopItem"><div><h3>${['旅人の釣り竿','月糸の釣り竿','星織りの釣り竿'][save.rod]}</h3><p>強化 ${save.rod} / 2<br>光の帯が広がり、魚を追いやすくなる。</p></div><button id="buyRod" class="primary" ${save.rod>=2||save.coins<costs[save.rod]?'disabled':''}>${save.rod>=2?'強化済み':`強化する · ${costs[save.rod]} ✧`}</button></div><div class="shopItem"><div><h3>灯石のお守り</h3><p>魚が帯から外れた時の減少を30%軽減。</p></div><button id="buyCharm" class="primary" ${save.charm||save.coins<75?'disabled':''}>${save.charm?'装備済み':'75 ✧'}</button></div><p>最初は竿の強化がおすすめ。主と出会うには2回の強化が必要です。</p>`);
 $('buyRod').onclick=()=>{if(save.rod<2&&save.coins>=costs[save.rod]){save.coins-=costs[save.rod];save.rod++;persist();updateUI();chime();shop();}};
 $('buyCharm').onclick=()=>{if(!save.charm&&save.coins>=75){save.coins-=75;save.charm=1;persist();updateUI();chime();shop();}};
}
function canMenu(){if(state!=='idle'&&state!=='intro'){toast('釣りが終わってから、ひと休みしましょう。');return false;}return true;}
function rest(){
 if(!canMenu())return;
 openModal(`<span class="eyebrow">LET THE WORLD TURN</span><h2 id="modalTitle">灯りのそばで、ひと休み。</h2><p>釣りたい魚に合わせて、時間を進められます。<br>通常は3分ごとに夕暮れ・夜・夜明けが移り変わります。</p><div class="shopItem"><div><h3>次の時間帯へ</h3><p>夕暮れ → 星月夜 → 夜明け</p></div><button id="nextPhase" class="primary">時を待つ</button></div><div class="shopItem"><div><h3>空模様の変わり目へ</h3><p>晴れと雨で、訪れる魚が変わります。</p></div><button id="nextWeather" class="primary">空を眺める</button></div>`);
 $('nextPhase').onclick=()=>{save.time=(Math.floor(save.time/180)+1)*180;persist();worldUI();closeModal();};
 $('nextWeather').onclick=()=>{const rain=raining();do{save.time=(Math.floor(save.time/85)+1)*85;}while(raining()===rain);persist();worldUI();closeModal();};
}
function help(){if(!canMenu())return;openModal(`<span class="eyebrow">A GUIDE TO STILLNESS</span><h2 id="modalTitle">湖との、付き合いかた。</h2><div class="helpRows"><p><b>01　投げる</b><br>SPACE / 「釣り糸をたらす」でキャスト。魚が来るまで数秒待ちます。</p><p><b>02　合わせる</b><br>「HIT!」が出たら2.6秒以内に SPACE / 「引き上げる」。</p><p><b>03　追いかける</b><br>SPACE / リールボタンを長押しすると光の帯が右へ、離すと左へ。魚の ◆ を帯に入れ続けて100%に。0%になると逃げます。</p><p><b>04　集める</b><br>6種を見つけ、工房で竿を2回強化。夜に現れる湖の主を釣りましょう。図鑑の出現条件がヒントです。</p><p>J：図鑑　U：工房　ESC：閉じる / 釣りをやめる<br>自動保存対応。メニュー中・非表示タブでは時間が止まります。<br>音は右上の ♪ から切替。タッチ操作にも対応。</p></div>`);}
function drawFish(c,f,silhouette=false){
 const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.imageSmoothingEnabled=false;
 const k=c.width/44;g.save();g.scale(k,k);g.translate(1,1);
 const color=silhouette?'#37545d':f.color,light=silhouette?'#37545d':f.accent;
 g.fillStyle=color;
 const shape=[[9,9,24,6],[12,7,18,10],[16,5,11,13],[5,7,4,10],[2,5,3,14],[30,9,6,6],[19,3,7,3],[20,17,7,3]];
 shape.forEach(r=>g.fillRect(...r));g.fillStyle=light;g.fillRect(13,8,16,2);g.fillRect(17,10,12,2);g.fillRect(16,14,15,2);g.fillRect(3,7,2,4);
 g.fillStyle=silhouette?'#37545d':'#284a55';g.fillRect(12,15,16,2);g.fillRect(29,10,2,2);g.fillRect(33,13,3,1);
 if(!silhouette){g.fillStyle='#fff9db';g.fillRect(29,9,1,1);g.globalAlpha=.45;g.fillStyle='#fff';for(let x=16;x<27;x+=4)g.fillRect(x,11,1,3);}
 g.globalAlpha=1;g.fillStyle=light;
 if(f.id==='veil'||f.id==='star'){g.fillRect(1,2,2,5);g.fillRect(0,1,1,3);g.fillRect(1,16,2,5);g.fillRect(3,19,7,1);g.fillRect(17,18,1,4);}
 if(f.id==='rain'){g.fillRect(34,14,7,1);g.fillRect(38,15,1,3);g.fillRect(31,16,7,1);g.fillRect(36,17,1,2);}
 if(f.id==='moon'){g.fillRect(15,4,10,1);g.fillRect(18,2,5,2);g.fillStyle='#6195bd';g.fillRect(2,10,10,2);}
 if(f.id==='sun'){g.fillStyle='#f6c0cb';g.fillRect(12,12,19,2);g.fillStyle='#586986';for(let x=14;x<28;x+=3)g.fillRect(x,8,1,1);}
 if(f.kind==='lord'){g.fillStyle=light;g.fillRect(5,2,2,6);g.fillRect(7,3,5,2);g.fillRect(6,16,2,6);g.fillRect(8,19,8,2);g.fillRect(21,0,1,4);}
 g.restore();
}
const player=[
'          hhhhh       ',
'        hHHHHHhh      ',
'       hhHHHHHHhhh    ',
'       hhhhhhhhhhh    ',
'         ssSSs       ',
'         sSSSs       ',
'         sSSs        ',
'        crrrrc       ',
'       crrrrrrc      ',
'      ccRrrrrRc      ',
'      cCRrrrrRcs     ',
'      cCRrrrrRcSS    ',
'      ccRrrrrRcs     ',
'       crrrrrrc      ',
'       ccCCCCcc      ',
'        bbbbBb       ',
'        bb bbB       ',
'        bb bbB       ',
'       BBB BBBB      '
];
const palette={h:'#38354c',H:'#9aa7a6',s:'#b88065',S:'#e4b58b',c:'#223d4c',C:'#3c6067',r:'#c1b48b',R:'#e1d4a8',b:'#263445',B:'#494852'};
function drawPlayer(){
 const bob=Math.sin(t*1.8)*.65;ctx.save();ctx.translate(583,536+bob);ctx.scale(2.1,2.1);
 ctx.fillStyle='#031b2890';ctx.beginPath();ctx.ellipse(2,2,12,3,0,0,7);ctx.fill();
 player.forEach((row,y)=>[...row].forEach((s,x)=>{if(palette[s]){ctx.fillStyle=palette[s];ctx.fillRect(x-10,y-19,1,1);}}));
 // A gently moving scarf and warm brass fishing reel.
 ctx.fillStyle='#b7594e';ctx.fillRect(-3,-11,7,2);ctx.fillRect(-6-Math.round(Math.sin(t*3)), -10,5,2);
 ctx.fillStyle='#d9bc73';ctx.fillRect(6,-8,2,2);ctx.restore();
 const moving=state==='casting'?Math.sin((.7-wait)*5)*70:0;
 ctx.strokeStyle='#bca373';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(598,516);ctx.quadraticCurveTo(630,471-moving,665,470-moving);ctx.stroke();
 if(['waiting','bite','fight','casting'].includes(state)){
 const by=610+Math.sin(t*3)*2+(state==='bite'?Math.sin(t*22)*7:0);
 ctx.strokeStyle='#e0ddba90';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(665,470-moving);ctx.quadraticCurveTo(707,570,790,by);ctx.stroke();
 ctx.fillStyle='#fbdf9d';ctx.fillRect(787,by-8,5,7);ctx.fillStyle='#ba664d';ctx.fillRect(787,by-1,5,5);
 if(state==='bite'){ctx.font='bold 24px Georgia';ctx.fillStyle='#fff2c1';ctx.textAlign='center';ctx.shadowColor='#f8cb60';ctx.shadowBlur=15;ctx.fillText('!',790,by-35);ctx.shadowBlur=0;}
 if(Math.sin(t*5)>.96&&rings.length<10)rings.push({x:790,y:by+5,life:0});
 } 
}
function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,1.6);canvas.width=w*dpr;canvas.height=h*dpr;scale=Math.max(w/1536,h/1024);ox=(w-1536*scale)/2;oy=(h-1024*scale)/2;}
addEventListener('resize',resize);resize();
function draw(dt){
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#102c3a';ctx.fillRect(0,0,w,h);
 const zoom=1+camera*.015,dx=mouse.x*3,dy=mouse.y*2;
 ctx.translate(ox+dx,oy+dy);ctx.translate(768*scale,512*scale);ctx.scale(scale*zoom,scale*zoom);ctx.translate(-768,-512);
 if(bg.complete&&bg.naturalWidth){
 ctx.drawImage(bg,0,0,1536,1024);
 // Refracted scanlines only within the open water polygon.
 ctx.save();ctx.beginPath();ctx.moveTo(720,425);ctx.lineTo(970,425);ctx.lineTo(1070,462);ctx.lineTo(1390,440);ctx.lineTo(1270,760);ctx.lineTo(980,900);ctx.lineTo(730,970);ctx.lineTo(420,700);ctx.lineTo(400,610);ctx.lineTo(670,590);ctx.lineTo(690,450);ctx.closePath();ctx.clip();
 for(let y=430;y<980;y+=4){const wave=Math.sin(y*.064+t*1.2)*(1+(y-430)/180);ctx.drawImage(bg,0,y,bg.width,4,wave,y,1536,4);}
 ctx.globalCompositeOperation='screen';
 for(let i=0;i<38;i++){const yy=460+(i*53%430),xx=440+(i*137%850)+Math.sin(t*.3+i)*20;ctx.globalAlpha=(.05+.07*Math.sin(t+i)**2);ctx.fillStyle=i%3?'#9accd0':'#ffe6a2';ctx.fillRect(xx,yy,12+i%21,1.3);}
 ctx.restore();
 }
 const p=phase();nightBlend+=(Number(p===1)-nightBlend)*Math.min(1,dt*.7);dawnBlend+=(Number(p===2)-dawnBlend)*Math.min(1,dt*.7);
 ctx.fillStyle=`rgba(8,19,60,${nightBlend*.38})`;ctx.fillRect(0,0,1536,1024);
 const sky=ctx.createLinearGradient(0,0,0,500);sky.addColorStop(0,`rgba(6,19,57,${nightBlend*.83})`);sky.addColorStop(.65,`rgba(15,31,67,${nightBlend*.6})`);sky.addColorStop(1,'rgba(6,19,57,0)');ctx.fillStyle=sky;ctx.fillRect(0,0,1536,500);
 ctx.fillStyle=`rgba(221,159,131,${dawnBlend*.14})`;ctx.fillRect(0,0,1536,1024);
 if(p===1){ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<60;i++){const x=(i*127.7)%1500,y=30+(i*39.4)%290;ctx.globalAlpha=.3+.5*Math.sin(t*.6+i)**2;ctx.fillStyle='#c9e1e9';ctx.fillRect(x,y,i%8===0?2:1.2,1.2);}ctx.restore();}
 // Lantern bloom, gently moving volumetric mist and near-field fireflies.
 ctx.save();ctx.globalCompositeOperation='screen';
 const glow=ctx.createRadialGradient(647,503,2,647,503,95);glow.addColorStop(0,'#ffcd7265');glow.addColorStop(.35,'#ecac4a20');glow.addColorStop(1,'#e6c26500');ctx.fillStyle=glow;ctx.globalAlpha=.85+Math.sin(t*3)*.12;ctx.fillRect(552,408,190,190);
 for(let i=0;i<5;i++){const x=380+i*230+Math.sin(t*.07+i)*70,y=432+i%2*20;const fog=ctx.createRadialGradient(x,y,0,x,y,230);fog.addColorStop(0,'#b3d9dc0e');fog.addColorStop(1,'#9ec9d000');ctx.fillStyle=fog;ctx.save();ctx.translate(x,y);ctx.scale(1,.12);ctx.fillRect(-230,-230,460,460);ctx.restore();}
 for(let i=0;i<32;i++){const x=250+(i*81.23)%1030+Math.sin(t*.4+i*4)*25,y=440+(i*53.7)%450+Math.cos(t*.6+i)*14,a=.2+.6*Math.sin(t+i)**2;ctx.globalAlpha=a;ctx.fillStyle=i%4?'#b9e5b0':'#ffe4a4';ctx.shadowColor='#d7e89d';ctx.shadowBlur=10;ctx.fillRect(x,y,2,2);}ctx.shadowBlur=0;ctx.restore();
 drawPlayer();
 rings.forEach(r=>{r.life+=dt;ctx.strokeStyle=`rgba(190,230,225,${Math.max(0,.65-r.life*.32)})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(r.x,r.y,5+r.life*25,2+r.life*8,0,0,Math.PI*2);ctx.stroke();});for(let i=rings.length-1;i>=0;i--)if(rings[i].life>2)rings.splice(i,1);
 particles.forEach(a=>{a.life+=dt;a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy+=95*dt;ctx.globalAlpha=Math.max(0,1-a.life/a.max);ctx.fillStyle=a.color;ctx.fillRect(a.x,a.y,3,3);});ctx.globalAlpha=1;for(let i=particles.length-1;i>=0;i--)if(particles[i].life>particles[i].max)particles.splice(i,1);
 if(raining()){
 ctx.fillStyle='#163c5230';ctx.fillRect(0,0,1536,1024);ctx.strokeStyle='#b6d7e248';ctx.lineWidth=1;
 for(let i=0;i<120;i++){const x=(i*127+(t*95))%1600,y=(i*73+t*430)%1080;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4,y+15);ctx.stroke();}
 if(Math.random()<dt*8)rings.push({x:720+Math.random()*500,y:490+Math.random()*250,life:1});
 }
 // Separate near-camera foliage plane, subtly swaying above the scene.
 if(bg.complete&&bg.naturalWidth){
 ctx.save();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(345,0);ctx.lineTo(270,74);ctx.lineTo(178,94);ctx.lineTo(119,218);ctx.lineTo(69,339);ctx.lineTo(0,402);ctx.closePath();ctx.clip();
 ctx.translate(Math.sin(t*.65)*2.5+mouse.x*5,Math.cos(t*.4)*1.2);ctx.drawImage(bg,0,0,1536,1024);ctx.fillStyle=`rgba(8,19,60,${nightBlend*.4})`;ctx.fillRect(0,0,400,440);ctx.restore();
 }
}
function tick(now){
 const dt=Math.min(.05,(now-last)/1000||.016);last=now;
 if(!document.hidden){
 t+=dt;camera+=(Number(state==='fight')-camera)*dt*2;
 if(state!=='intro'&&!modalOpen){save.time+=dt;if(Math.floor(save.time)%5===0&&Math.floor(save.time)!==quality){quality=Math.floor(save.time);persist();}worldUI();
 if(sound&&t>musicClock){musicClock=t+2.8;const melody=[220,329.63,392,493.88,440,329.63,293.66,246.94];note(melody[Math.floor(t/2.8)%8],3.8,.016);note(110,4,.012,'sine');}
 if(state==='casting'){wait-=dt;if(wait<=0){state='waiting';wait=2.5+Math.random()*2.6;splash(790,610);$('stateLabel').textContent='LISTEN TO THE WATER';$('message').textContent='水の向こうに、誰かがいる。';$('actionText').textContent='魚の気配を待っています';}}
 else if(state==='waiting'){wait-=dt;if(wait<=0){state='bite';bite=2.6;splash(790,610,22);$('stateLabel').textContent='✦ HIT! ✦';$('message').textContent='いま、魚が食いついた！';$('actionText').textContent='引き上げる';$('actionBtn').disabled=false;$('hint').textContent='SPACE / クリックで合わせる！';note(880,.2,.07);note(1174,.5,.06,'sine',.12);}}
 else if(state==='bite'){bite-=dt;if(bite<=0)idle('魚は、湖の奥へ。また投げてみよう。');}
 else if(state==='fight'){
 fightTime+=dt;const zoneWidth=.27+save.rod*.055;
 cursor=Math.max(zoneWidth/2,Math.min(1-zoneWidth/2,cursor+(held?1:-1)*dt*.43));
 fishPos=fishMotion(fish,fightTime);const inside=Math.abs(cursor-fishPos)<zoneWidth/2;
 progress+=dt*(inside?(fish.id==='guardian'?.085:.125):-.09*(save.charm?.7:1));progress=Math.max(0,Math.min(1,progress));
 $('zone').style.width=zoneWidth*100+'%';$('zone').style.left=(cursor-zoneWidth/2)*100+'%';$('zone').style.background=inside?'#84d1af79':'#74bca82a';
 $('fishMarker').style.left=fishPos*100+'%';$('catchPercent').textContent=Math.floor(progress*100)+'%';$('reelFill').style.width=progress*100+'%';$('tensionLabel').textContent=inside?'いい調子。そのまま、光の中に。':'魚が帯の外へ。落ち着いて追おう。';
 if(inside&&Math.floor(fightTime*4)!==missTime){missTime=Math.floor(fightTime*4);note(330+progress*220,.07,.008);}
 if(progress>=1)catchFish();else if(progress<=0){splash(790,610);idle('糸がゆるみ、魚は湖へ。もう一度。');}
 }
 }
 draw(dt);
 }requestAnimationFrame(tick);
}
$('startBtn').onclick=start;$('actionBtn').onclick=action;
$('bookBtn').onclick=book;$('shopBtn').onclick=shop;$('restBtn').onclick=rest;$('helpBtn').onclick=help;$('closeModal').onclick=closeModal;
$('soundBtn').onclick=()=>{if(!sound)initSound();else{sound=false;$('soundLabel').textContent='音 OFF';$('soundBtn').setAttribute('aria-pressed','false');}};
$('fullscreenBtn').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>toast('このブラウザでは全画面を利用できません。'));};
$('reelBtn').addEventListener('pointerdown',e=>{e.preventDefault();held=true;$('reelBtn').setPointerCapture(e.pointerId);});
addEventListener('pointerup',()=>held=false);addEventListener('pointercancel',()=>held=false);addEventListener('blur',()=>held=false);
addEventListener('pointermove',e=>{mouse.x=e.clientX/innerWidth-.5;mouse.y=e.clientY/innerHeight-.5;});
addEventListener('keydown',e=>{
 if(modalOpen){
 if(e.code==='Escape'){e.preventDefault();closeModal();}
 if(e.code==='Tab'){const els=[...$('modal').querySelectorAll('button:not([disabled])')];const first=els[0],lastEl=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();lastEl.focus();}else if(!e.shiftKey&&document.activeElement===lastEl){e.preventDefault();first.focus();}}
 return;
 }
 if(e.code==='Space'){e.preventDefault();if(e.repeat)return;if(state==='intro')start();else if(state==='fight')held=true;else action();}
 if(e.code==='KeyJ')book();if(e.code==='KeyU')shop();
 if(e.code==='Escape'&&state!=='intro'){idle('ひと休み。湖はいつでも待っている。');}
});
addEventListener('keyup',e=>{if(e.code==='Space'){held=false;e.preventDefault();}});
document.addEventListener('visibilitychange',()=>{held=false;if(document.hidden){persist();audio?.suspend();}else if(sound)audio?.resume();});
addEventListener('pagehide',persist);
updateUI();worldUI();requestAnimationFrame(tick);
// Read-only diagnostics: used by the actual-browser QA and capture script.
window.lumenlake={get state(){return state;},get progress(){return progress;},get cursor(){return cursor;},get fishPosition(){return fishPos;},get fish(){return fish?.id;},get save(){return JSON.parse(JSON.stringify(save));}};
})();
