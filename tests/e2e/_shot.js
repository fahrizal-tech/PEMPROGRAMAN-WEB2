const puppeteer = require("puppeteer-core"); const fs=require("fs");
const EDGE = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(fs.existsSync);
const [OUT, URL, NAME, CLICK] = process.argv.slice(2), R="file:///D:/PERKULIAHAN/PEMROGRAMAN%20WEB%20II-2SKS/TUGAS%20P1/";
(async()=>{ const b=await puppeteer.launch({executablePath:EDGE,headless:true}); const p=await b.newPage(); await p.setViewport({width:1280,height:900});
 await p.goto(R+"index.html"); await p.type("#identifier","admin@nexus.ac.id"); await p.type("#password","nexus2026");
 await Promise.all([p.waitForNavigation(),p.click('#login-form button[type="submit"]')]);
 await p.goto(R+URL); await new Promise(r=>setTimeout(r,1800));
 await p.screenshot({path:`${OUT}/${NAME}-d.png`});
 if (CLICK) { await p.click(CLICK); await new Promise(r=>setTimeout(r,700)); await p.screenshot({path:`${OUT}/${NAME}-modal.png`}); await p.keyboard.press("Escape"); }
 await p.setViewport({width:390,height:844}); await new Promise(r=>setTimeout(r,600)); await p.screenshot({path:`${OUT}/${NAME}-m.png`});
 await b.close(); })();
