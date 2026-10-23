// Renders the profile README's images in the portfolio's Pokémon / neo-brutalist style.
// Content comes from the live portfolio API, so re-running picks up edits made in the admin app.
// Usage: npm install && npm run build   (needs Google Chrome installed)
import { mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const OUT = new URL('./out/', import.meta.url)
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const SITE = 'https://www.miconakase.xyz'

// Programming works that aren't on the portfolio yet
const EXTRA_PROJECTS = [
  { title: 'Mokusei AI', desc: "Multi-agent AI framework with distinct personalities and expertise, powered by Jupiter's Moon.", tags: ['Python', 'FastAPI'], role: 'Ongoing', slug: 'mokusei-ai' },
  { title: 'Truchorus Website', desc: 'Website for Truchorus Performance Company.', tags: ['React'], role: 'Ongoing', slug: 'truchorus-frontend' },
  { title: 'Daily Spot Cafe', desc: 'E-commerce platform with ordering system and menu management for Daily Spot Cafe.', tags: ['PHP', 'Bootstrap'], role: 'Commission', slug: 'daily-spot-cafe' },
]

const THEMES = {
  light: { bg: '#fffbea', surface: '#ffffff', sunken: '#f4efd9', ink: '#111111', text: '#1a1a1a', muted: '#4d4a42', yellow: '#ffd60a', red: '#e3350d', blue: '#2a5bd7', blueDeep: '#1b3d99', green: '#2fb35a', dots: '#11111114', invert: 0 },
  dark: { bg: '#15151b', surface: '#202029', sunken: '#1a1a22', ink: '#ece8d9', text: '#ece8d9', muted: '#b2ad9c', yellow: '#ffd60a', red: '#ff5a36', blue: '#5b8cff', blueDeep: '#2a5bd7', green: '#4fd27a', dots: '#ffffff10', invert: 1 },
}

const ICON_PATHS = {
  github: 'M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z',
  linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
  facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
}
const STROKE_ICONS = {
  mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
}
const icon = (name, size = 18) =>
  ICON_PATHS[name]
    ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="${ICON_PATHS[name]}"/></svg>`
    : `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${STROKE_ICONS[name]}</svg>`

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const pad = (n, w = 3) => String(n).padStart(w, '0')

const css = (t) => `
  :root { --bg:${t.bg}; --surface:${t.surface}; --sunken:${t.sunken}; --ink:${t.ink}; --text:${t.text}; --muted:${t.muted};
          --yellow:${t.yellow}; --red:${t.red}; --blue:${t.blue}; --blue-deep:${t.blueDeep}; --green:${t.green}; --dots:${t.dots};
          --pixel:'Press Start 2P', monospace; --display:'Pixelify Sans', 'Press Start 2P', sans-serif; --sans:'Space Grotesk', system-ui, sans-serif; }
  * { box-sizing: border-box; margin: 0; }
  html, body { background: transparent; }
  body { font-family: var(--sans); color: var(--text); -webkit-font-smoothing: antialiased; }
  #root { display: inline-block; padding: 0 10px 10px 0; }
  .halftone { background-color: var(--bg); background-image: radial-gradient(circle, var(--dots) 1.6px, transparent 2px); background-size: 22px 22px; }
  .box { background: var(--surface); border: 3px solid var(--ink); box-shadow: 4px 4px 0 0 var(--ink); }
  .panel { border: 3px solid var(--ink); box-shadow: 8px 8px 0 0 var(--ink); }
  .dialog { position: relative; background: var(--surface); border: 3px solid var(--ink);
            box-shadow: inset 0 0 0 4px var(--surface), inset 0 0 0 6px var(--ink), 4px 4px 0 0 var(--ink); }
  .eyebrow { font-family: var(--pixel); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
  .eyebrow b { color: var(--red); font-weight: normal; }
  .chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; font-family: var(--pixel); font-size: 9px; line-height: 1.6;
          text-transform: uppercase; white-space: nowrap; border: 2px solid var(--ink); background: var(--surface); color: var(--text); }
  .chip.yellow { background: var(--yellow); color: #111; }
  .chip.red { background: var(--red); color: #fff; }
  .chip.green { background: var(--green); color: #111; }
  .highlight { display: inline-block; background: var(--yellow); color: #111; border: 3px solid var(--ink); box-shadow: 8px 8px 0 0 var(--ink); padding: 2px 16px; transform: rotate(-1deg); }
  .hero-text { font-family: var(--pixel); color: var(--yellow); -webkit-text-stroke: .035em var(--blue-deep); paint-order: stroke fill;
               text-shadow: .05em .05em 0 var(--blue-deep), .09em .09em 0 #111; white-space: nowrap; }
  .pokeball { position: relative; display: inline-block; width: 1em; height: 1em; border-radius: 50%; border: .08em solid #111; flex-shrink: 0;
              background: linear-gradient(to bottom, var(--red) 0 44%, #111 44% 56%, #fff 56% 100%); }
  .pokeball::after { content: ''; position: absolute; top: 50%; left: 50%; width: .32em; height: .32em; border-radius: 50%;
                     background: #fff; border: .07em solid #111; transform: translate(-50%, -50%); }
  .mono-icon { filter: invert(${t.invert}); }
`

const page = (t, body) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Pixelify+Sans:wght@400..700&family=Space+Grotesk:wght@400..700&display=block" rel="stylesheet">
<style>${css(t)}</style></head><body><div id="root">${body}</div></body></html>`

// ---------- Sections ----------

const banner = () => `
<div class="halftone panel" style="position:relative; width:1270px; height:410px; overflow:hidden; display:flex; flex-direction:column; align-items:center; justify-content:center;">
  ${[[46, 'left:70px;top:90px', -20], [28, 'left:150px;top:320px', 15], [54, 'right:80px;top:70px', 25], [24, 'right:70px;top:220px', -10], [20, 'left:300px;top:40px', 40]]
    .map(([s, pos, r]) => `<span class="pokeball" style="position:absolute;font-size:${s}px;${pos};transform:rotate(${r}deg)"></span>`).join('')}
  <div class="eyebrow" style="position:absolute;left:22px;top:18px;color:var(--text)"><b>No.001</b> · Trainer</div>
  <div style="font-family:var(--pixel);font-size:13px;color:var(--text);margin-bottom:26px">Hi, I'm</div>
  <div class="hero-text" style="font-size:88px;line-height:1">MICO NAKASE</div>
  <div style="display:flex;gap:18px;align-items:stretch;margin-top:38px">
    <div class="dialog" style="padding:18px 44px 18px 24px;font-family:var(--pixel);font-size:13px;line-height:2">A wild DEVELOPER appeared!
      <span style="position:absolute;right:16px;bottom:8px;color:var(--red);font-size:10px">▼</span></div>
    <div class="box" style="display:flex;align-items:center;background:var(--yellow);color:#111;padding:0 20px;font-weight:700;font-size:18px;transform:rotate(-1.5deg)">
      Full Stack &amp; Gen AI Developer · Music Producer</div>
  </div>
  <div class="box" style="position:absolute;right:22px;bottom:16px;font-family:var(--pixel);font-size:11px;padding:7px 10px;box-shadow:2px 2px 0 0 var(--ink)">miconakase.xyz</div>
</div>`

const header = (no, title, sub) => `
<div style="width:870px;padding:14px 4px 6px">
  <div class="eyebrow" style="margin-bottom:16px"><b>No.${pad(no)}</b> · ${esc(sub)}</div>
  <div style="display:flex;align-items:center;gap:26px">
    <div style="font-family:var(--display);font-weight:700;font-size:52px;line-height:1;text-transform:uppercase"><span class="highlight">${esc(title)}</span></div>
    <div style="flex:1;height:10px;background:repeating-linear-gradient(90deg,var(--ink) 0 14px,transparent 14px 22px)"></div>
    <span class="pokeball" style="font-size:52px;box-shadow:4px 4px 0 0 var(--ink)"></span>
  </div>
</div>`

const energy = (s, size = 22) =>
  `<span style="width:${size}px;height:${size}px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:#fff;border:2px solid #111;color:#111;font-size:${Math.round(size * 0.55)}px;line-height:1;flex-shrink:0">${s}</span>`

const tradingCard = (photo) => `
<div style="width:330px;border-radius:16px;background:#ffd60a;border:3px solid #111;padding:10px;box-shadow:8px 8px 0 0 var(--ink);color:#111;transform:rotate(1.5deg)">
  <div style="border-radius:7px;border:2px solid #111;background:linear-gradient(160deg,#fff7c9 0%,#f9e27a 45%,#f2c94c 100%);padding:8px 13px 9px">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-family:var(--pixel);font-size:7px;padding:2px 4px;background:#fff;border:1px solid #111">BASIC</span>
      <span style="font-family:var(--display);font-weight:700;font-size:24px;line-height:1;text-transform:uppercase">Mico</span>
      <span style="margin-left:auto;font-family:var(--pixel);font-size:8px">HP</span>
      <span style="font-family:var(--display);font-weight:700;font-size:24px;line-height:1;color:#c8281a">120</span>
      ${energy('⚡', 26)}
    </div>
    <div style="margin-top:7px;height:190px;padding:3px;background:linear-gradient(135deg,#f4f4f4,#a9a9a9 45%,#ececec 60%,#9a9a9a);border:2px solid #111">
      <img src="${photo}" style="display:block;width:100%;height:100%;object-fit:cover;object-position:50% 25%">
    </div>
    <div style="margin:-1px 14px 0;padding:2px 8px;background:linear-gradient(90deg,#c9c9c9,#f2f2f2,#c9c9c9);border:2px solid #111;border-top:0;text-align:center;font-size:10px;font-style:italic;font-weight:600">
      No.001 · Developer &amp; Producer · Laguna, PH</div>
    ${[
      [['⚡', '★'], 'Full Stack', 120, 'Ships a web app from database to UI in a single turn.'],
      [['♪', '★'], 'Drop the Beat', 90, 'Produces an original track. The crowd is hyped.'],
    ].map(([cost, name, dmg, text]) => `
    <div style="margin-top:9px">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="display:flex;gap:2px">${cost.map((c) => energy(c, 22)).join('')}</span>
        <span style="font-weight:700;font-size:16px">${name}</span>
        <span style="margin-left:auto;font-family:var(--display);font-weight:700;font-size:21px">${dmg}</span>
      </div>
      <p style="margin-top:2px;font-size:12px;line-height:1.35">${text}</p>
    </div>`).join('')}
    <div style="margin-top:9px;padding-top:6px;border-top:2px solid #111;display:grid;grid-template-columns:repeat(3,1fr);text-align:center;font-size:9px;font-weight:600;text-transform:uppercase">
      <div>weakness<div style="font-size:12px;text-transform:none">☕ ×2</div></div>
      <div>resistance<div style="font-size:12px;text-transform:none">🐛 −30</div></div>
      <div>retreat<div style="display:flex;justify-content:center;margin-top:2px">${energy('★', 15)}</div></div>
    </div>
    <p style="margin-top:7px;padding:4px 8px;border:1px solid #111;background:#ffffff99;font-size:11px;font-style:italic;line-height:1.35">Turns coffee into clean code and late nights into beats.</p>
    <div style="margin-top:4px;display:flex;justify-content:space-between;font-size:9px;font-weight:600"><span>Illus. Mico Nakase</span><span>001/165 ★</span></div>
  </div>
</div>`

const about = ({ photo, projectCount, trackCount, years }) => `
<div class="halftone panel" style="width:870px;padding:34px 34px 38px;display:flex;gap:34px;align-items:flex-start">
  <div style="flex:1;min-width:0">
    <div style="font-family:var(--display);font-weight:700;text-transform:uppercase;line-height:.95;margin-bottom:26px">
      <span style="display:block;font-size:26px">Hi, I'm</span>
      <span class="highlight" style="margin-top:10px;font-size:46px">Mico Nakase</span>
    </div>
    <div class="dialog" style="padding:20px 22px;font-size:16px;line-height:1.65">
      I'm a <b>Full Stack &amp; Generative AI Developer</b> and <b>music producer</b> who enjoys building things that look good and work well.
      I like writing clean code just as much as I like producing beats — always learning, always creating.
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:22px;font-size:15px">
      ${[
        ['⚡', 'Junior AI Engineer', 'Prosperna Philippines'],
        ['♪', 'Producer &amp; External VP', 'Truchorus Performance Company'],
        ['★', 'BS Information Technology', 'Saint Francis Institute of Computer Studies'],
      ].map(([e, role, org]) => `<div style="display:flex;align-items:center;gap:10px">${energy(e, 24)}<span><b>${role}</b> · ${org}</span></div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:26px">
      ${[[projectCount, 'Projects Built'], [trackCount, 'Tracks Produced'], [years, 'Years Coding']]
        .map(([v, l]) => `<div class="box" style="padding:14px 16px"><span style="display:block;font-family:var(--pixel);font-size:32px;line-height:1;margin-bottom:12px">${pad(v, 2)}</span><span class="eyebrow" style="font-size:8px">${l}</span></div>`).join('')}
    </div>
  </div>
  <div style="flex:0 0 auto;padding-top:6px">${tradingCard(photo)}</div>
</div>`

const duration = (start) => {
  const [y, m] = start.split('-').map(Number)
  const months = (new Date().getFullYear() - y) * 12 + (new Date().getMonth() + 1 - m)
  return months >= 12 ? `${Math.floor(months / 12)}Y ${months % 12}M` : `${Math.max(months, 1)}M`
}
const MONO = /simple-icons|lobehub|github-original/

const skillTile = (s, big = false) => `
<div class="box" style="display:flex;${big ? 'flex-direction:column;padding:16px 10px 12px;gap:10px' : 'padding:9px 12px;gap:10px'};align-items:center;${big ? '' : 'min-width:0'}">
  <img src="${s.icon}" class="${MONO.test(s.icon) ? 'mono-icon' : ''}" style="width:${big ? 46 : 26}px;height:${big ? 46 : 26}px;object-fit:contain;flex-shrink:0">
  <div style="${big ? 'text-align:center' : 'min-width:0'}">
    <div style="font-weight:700;font-size:${big ? 16 : 14}px;white-space:nowrap">${esc(s.name)}</div>
    <div style="font-family:var(--pixel);font-size:8px;color:var(--muted);margin-top:5px">EXP ${duration(s.startDate)}</div>
  </div>
</div>`

const skills = (list) => {
  const party = list.filter((s) => s.party).sort((a, b) => a.party - b.party)
  const groups = ['AI', 'Frontend', 'Backend', 'Tools']
  return `
<div class="halftone panel" style="width:870px;padding:30px 32px 34px">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
    <span class="pokeball" style="font-size:22px"></span><span style="font-family:var(--pixel);font-size:14px">MY PARTY</span>
    <span class="eyebrow" style="font-size:8px;margin-left:auto">Main stack · Lv. by experience</span>
  </div>
  <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:30px">${party.map((s) => skillTile(s, true)).join('')}</div>
  ${groups.map((g) => `
  <div style="margin-top:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <span class="chip yellow">${g}</span><div style="flex:1;height:3px;background:var(--ink)"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
      ${list.filter((s) => s.group === g).map((s) => skillTile(s)).join('')}
    </div>
  </div>`).join('')}
</div>`
}

const COVER_COLORS = ['#ffd60a', '#e3350d', '#2a5bd7', '#2fb35a', '#8b5cf6']
const workCard = (p, i) => `
<div class="box" style="width:420px;box-shadow:8px 8px 0 0 var(--ink)">
  <div style="height:220px;border-bottom:3px solid var(--ink);position:relative;overflow:hidden;
              ${p.img ? '' : `background:${COVER_COLORS[i % COVER_COLORS.length]};background-image:radial-gradient(circle,#11111122 1.6px,transparent 2px);background-size:18px 18px;`}">
    ${p.img
      ? `<img src="${p.img}" style="width:100%;height:100%;object-fit:cover;object-position:top">`
      : `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:20px">
           <span class="hero-text" style="font-size:${p.title.length > 14 ? 22 : 28}px;white-space:normal;text-align:center;line-height:1.4">${esc(p.title.toUpperCase())}</span></div>
         <span class="pokeball" style="position:absolute;right:16px;bottom:14px;font-size:34px"></span>`}
    <span class="chip" style="position:absolute;left:12px;top:12px;background:#fff;color:#111;border-color:#111">No.${pad(i + 1)}</span>
  </div>
  <div style="padding:16px 18px 18px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-weight:700;font-size:21px">${esc(p.title)}</span>
      ${p.year ? `<span class="eyebrow" style="margin-left:auto;font-size:9px">${p.year}</span>` : ''}
    </div>
    <p style="font-size:14px;line-height:1.5;color:var(--muted);min-height:42px">${esc(p.desc)}</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px">
      ${p.role ? `<span class="chip yellow">${esc(p.role.split('·')[0].trim())}</span>` : ''}
      ${(p.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join('')}
    </div>
  </div>
</div>`

const trackCard = (m, i) => `
<div class="box" style="width:276px;box-shadow:6px 6px 0 0 var(--ink)">
  <div style="height:276px;border-bottom:3px solid var(--ink);position:relative;overflow:hidden;
              ${m.img ? '' : 'background:#e3350d;background-image:radial-gradient(circle,#11111122 1.6px,transparent 2px);background-size:18px 18px;'}">
    ${m.img
      ? `<img src="${m.img}" style="width:100%;height:100%;object-fit:cover">`
      : `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:18px">
           <span class="hero-text" style="font-size:20px;white-space:normal;text-align:center;line-height:1.5">${esc(m.title.toUpperCase())}</span></div>`}
    <span class="chip" style="position:absolute;left:10px;top:10px;background:#fff;color:#111;border-color:#111">♪ ${pad(i + 1, 2)}</span>
    <span style="position:absolute;right:12px;bottom:12px;width:46px;height:46px;border-radius:50%;background:var(--yellow);border:3px solid #111;box-shadow:3px 3px 0 0 #111;display:flex;align-items:center;justify-content:center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#111"><polygon points="6 3 20 12 6 21 6 3"/></svg></span>
  </div>
  <div style="padding:14px 14px 16px">
    <div style="font-weight:700;font-size:18px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(m.title)}</div>
    <div class="eyebrow" style="font-size:8px;margin-top:8px">${esc(m.year)} · ${esc(m.genre)}</div>
    <div style="margin-top:12px;min-height:24px">${m.award
      ? `<span class="chip ${/runner|finalist/i.test(m.award) ? 'red' : ''}" style="white-space:normal;font-size:7.5px">${/runner|finalist/i.test(m.award) ? '★ ' : ''}${esc(m.award)}</span>`
      : '<span class="chip">Original</span>'}</div>
  </div>
</div>`

const journey = (timeline) => {
  const cols = [['work', 'Experience', '⚡'], ['lead', 'Leadership', '★'], ['edu', 'Education', '♪']]
  return `
<div class="halftone panel" style="width:870px;padding:30px 30px 34px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px;align-items:start">
  ${cols.map(([type, label, e]) => `
  <div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">${energy(e, 26)}<span style="font-family:var(--pixel);font-size:12px;text-transform:uppercase">${label}</span></div>
    <div style="position:relative;display:flex;flex-direction:column;gap:14px;padding-left:20px">
      <div style="position:absolute;left:5px;top:6px;bottom:6px;width:3px;background:var(--ink)"></div>
      ${timeline.filter((t) => t.type === type && !t.minor).map((t, i) => `
      <div style="position:relative">
        <span style="position:absolute;left:-21px;top:14px;width:13px;height:13px;background:${i === 0 ? 'var(--yellow)' : 'var(--surface)'};border:3px solid var(--ink)"></span>
        <div class="box" style="padding:12px 14px">
          <div class="eyebrow" style="font-size:8px;margin-bottom:8px;${/present/i.test(t.date) ? 'color:var(--red)' : ''}">${esc(t.date)}</div>
          <div style="font-weight:700;font-size:15px;line-height:1.25">${esc(t.title)}</div>
          <div style="font-size:12.5px;color:var(--muted);margin-top:4px;line-height:1.35">${esc(t.subtitle)}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>`).join('')}
</div>`
}

const button = (label, ic, yellow = false) => `
<div class="box" style="display:inline-flex;align-items:center;gap:10px;padding:14px 20px;font-family:var(--pixel);font-size:12px;text-transform:uppercase;white-space:nowrap;
     ${yellow ? 'background:var(--yellow);color:#111' : ''}">${icon(ic)}${label}</div>`

const footer = () => `
<div class="halftone panel" style="width:870px;padding:26px 30px;display:flex;align-items:center;gap:24px">
  <span class="hero-text" style="font-size:34px">MLN.</span>
  <div style="flex:1">
    <div style="font-weight:700;font-size:16px">Thanks for visiting, Trainer!</div>
    <div style="font-size:13px;color:var(--muted);margin-top:4px">San Pedro, Laguna · Philippines</div>
  </div>
  <span class="chip green" style="font-size:10px;padding:8px 12px"><span style="width:9px;height:9px;border-radius:50%;background:#111"></span>Open for commissions</span>
</div>`

// ---------- Build ----------

const res = await fetch(`${SITE}/api/content`)
if (!res.ok) throw new Error(`Content API returned ${res.status}`)
const content = await res.json()
const photo = `data:image/jpeg;base64,${(await readFile(new URL('./photo.jpg', import.meta.url))).toString('base64')}`

const projects = [
  ...content.projects.map((p) => ({ ...p, repo: p.slug === 'kevins-express-studio' ? 'ReservationSystem' : p.slug })),
  ...EXTRA_PROJECTS.map((p) => ({ ...p, repo: p.slug })),
]
const codingSince = new Date(2022, 7, 1)
const years = Math.floor((Date.now() - codingSince) / (365.25 * 24 * 60 * 60 * 1000))

const images = {
  banner: banner(),
  'h-about': header(1, 'About', 'Trainer profile'),
  'h-skills': header(2, 'Skills', 'Party & moves'),
  'h-works': header(3, 'Works', 'Programming'),
  'h-music': header(4, 'Music', 'Original tracks'),
  'h-journey': header(5, 'Journey', 'Trainer history'),
  'h-contact': header(6, 'Contact', 'Find me online'),
  about: about({ photo, projectCount: projects.length, trackCount: content.music.length, years }),
  skills: skills(content.skills),
  journey: journey(content.timeline),
  footer: footer(),
  'btn-portfolio': button('Portfolio', 'globe', true),
  'btn-cv': button('Download CV', 'download'),
  'btn-github': button('GitHub', 'github'),
  'btn-linkedin': button('LinkedIn', 'linkedin'),
  'btn-tiktok': button('TikTok', 'tiktok'),
  'btn-instagram': button('Instagram', 'instagram'),
  'btn-facebook': button('Facebook', 'facebook'),
  'btn-email': button('Email', 'mail'),
}
projects.forEach((p, i) => (images[`work-${p.repo}`] = workCard(p, i)))
content.music.forEach((m, i) => (images[`track-${m.slug}`] = trackCard(m, i)))

await mkdir(OUT, { recursive: true })
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
const tab = await browser.newPage()
await tab.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 })
for (const [themeName, theme] of Object.entries(THEMES)) {
  for (const [name, body] of Object.entries(images)) {
    await tab.setContent(page(theme, body), { waitUntil: 'load', timeout: 60000 })
    await tab.evaluate(async () => {
      await document.fonts.ready
      await Promise.all([...document.images].map((img) => img.decode().catch(() => {})))
    })
    const root = await tab.$('#root')
    await root.screenshot({ path: fileURLToPath(new URL(`${name}-${themeName}.png`, OUT)), omitBackground: true })
  }
}
await browser.close()

// Manifest the README is written from
console.log(JSON.stringify({ projects: projects.map((p) => p.repo), tracks: content.music.map((m) => m.slug) }))
