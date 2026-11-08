// Screenshot + probe DOM via CDP (dipakai reviewer). Pakai: node tools/shot-cdp.mjs <url> <out.png> <w> <h> <wait_ms>
// Alasan: --virtual-time-budget menggantung pada halaman dengan SSE terbuka.
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
const [url, out, w, h, wait] = process.argv.slice(2);
const ch = spawn('google-chrome', ['--headless=new','--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--hide-scrollbars','--remote-debugging-port=0',`--window-size=${w},${h}`,`--user-data-dir=/tmp/kantor-cdp-profile-${process.pid}`,'about:blank'], { stdio: ['ignore','ignore','inherit'] });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let port; for (let i=0;i<150;i++){ try { port = readFileSync(`/tmp/kantor-cdp-profile-${process.pid}/DevToolsActivePort`,'utf8').split('\n')[0]; if (port) break; } catch {} await sleep(200); }
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); const logs = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result); pend.delete(d.id); } else if (d.method === 'Runtime.consoleAPICalled' && ['error','warning'].includes(d.params.type)) logs.push(d.params.type+': '+d.params.args.map(a=>a.value ?? a.description).join(' ')); else if (d.method==='Runtime.exceptionThrown') logs.push('EXC: '+d.params.exceptionDetails.exception?.description); };
const send = (method, params={}) => new Promise(r => { const i=++id; pend.set(i, r); ws.send(JSON.stringify({ id:i, method, params })); });
await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate', { url }); await sleep(Number(wait));
const ev = await send('Runtime.evaluate', { expression: `JSON.stringify({conn: document.getElementById('stat-status-text')?.textContent, hist: [...document.querySelectorAll('#history-list .task-title')].map(e=>e.textContent), engines:[...document.querySelectorAll('.persona-card')].map(e=>e.innerText.split('\\n').filter(s=>s.startsWith('Mesin')).join()), dbg: document.getElementById('kantor-debug-dump')?.textContent})`, returnByValue: true });
console.log(ev.result.value); console.log(logs.join('\n'));
const shot = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(out, Buffer.from(shot.data, 'base64'));
ch.kill(); process.exit(0);
