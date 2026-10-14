/* app.js: tabs, entity picker, code walkthrough, live flow lab, practice, exam day */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('crud.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('crud.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 1800);
  }

  /* ---------------- syntax highlight (keeps entity marks) ---------------- */
  const KW = 'import|class|extends|with|final|const|return|if|else|async|await|static|void|required|this|super|factory|true|false|null|get|late|new|for|in|is|as|override';
  const RE = new RegExp(String.raw`(\/\/[^\n]*)|('''[\s\S]*?'''|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*")|(@\w+)|\b(\d+(?:\.\d+)?)\b|\b(${KW})\b|\b([A-Z][A-Za-z0-9_]*)\b`, 'g');
  function analyze(raw) {
    let text = '', ent = [], on = false;
    for (const ch of raw) {
      if (ch === '\u0001') { on = true; continue; }
      if (ch === '\u0002') { on = false; continue; }
      text += ch; ent.push(on);
    }
    const cls = new Array(text.length).fill('');
    let m; RE.lastIndex = 0;
    while ((m = RE.exec(text))) {
      const c = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 'n' : m[5] ? 'k' : 't';
      for (let i = m.index; i < m.index + m[0].length; i++) cls[i] = c;
    }
    return { text, ent, cls };
  }
  function emit(a, from = 0, to = a.text.length) {
    let out = '', i = from;
    while (i < to) {
      const c = a.cls[i], e = a.ent[i]; let j = i;
      while (j < to && a.cls[j] === c && a.ent[j] === e) j++;
      let s = esc(a.text.slice(i, j));
      if (c) s = `<span class="${c}">${s}</span>`;
      if (e) s = `<span class="e">${s}</span>`;
      out += s; i = j;
    }
    return out;
  }
  const codeHTML = raw => `<pre class="code"><code>${emit(analyze(raw))}</code></pre>`;

  /* ---------------- state ---------------- */
  const custom = store.get('custom', null);
  const state = {
    tab: 'learn',
    entKey: store.get('ent', 'Book'),
    mode: store.get('mode', 'lab'),
    custom,
  };
  function currentEnt() {
    if (state.entKey === '__custom' && state.custom) return state.custom;
    return Gen.ENTITIES.find(e => e.cls === state.entKey) || Gen.ENTITIES[0];
  }

  /* ---------------- sample data for the live app ---------------- */
  const POOL = {
    title: { Book: ['Dune', 'เจ้าชายน้อย', 'แฮร์รี่ พอตเตอร์'], Movie: ['Inception', 'Coco', 'Dune'], Song: ['Yellow', 'ลมหนาว', 'Fix You'], Todo: ['อ่านบท 13', 'ส่งงาน Mobile', 'ซักผ้า'] },
    name: { Student: ['มานี ใจดี', 'ปิติ รักเรียน', 'ชูใจ ตั้งใจ'], Product: ['ปากกาเจล', 'สมุดโน้ต', 'ยางลบ'], Pet: ['ส้มโอ', 'ข้าวตู', 'มะลิ'], Employee: ['วิชัย ทองดี', 'สุดา แก้วมณี', 'อรุณ ใจเย็น'], Course: ['Mobile App Dev', 'Algorithms', 'Image Processing'], Contact: ['พี่ต้น', 'น้องฝน', 'ลุงชัย'], Recipe: ['ผัดกะเพรา', 'ต้มยำกุ้ง', 'ข้าวมันไก่'], Hotel: ['ริมน่าน รีสอร์ท', 'ดอยคำ โฮเทล', 'บ้านทะเล'] },
    author: ['Frank Herbert', 'Saint-Exupéry', 'J.K. Rowling'], studentId: ['67312345', '67354321', '67300011'],
    species: ['แมว', 'หมา', 'กระต่าย'], position: ['Developer', 'Designer', 'Tester'], brand: ['Toyota', 'Honda', 'BYD'],
    model: ['Yaris', 'City', 'Dolphin'], code: ['273387', '254383', '273488'], artist: ['Coldplay', 'Bodyslam', 'Polycat'],
    phone: ['081-234-5678', '089-876-5432', '062-111-2233'], email: ['ton@nu.ac.th', 'fon@nu.ac.th', 'chai@nu.ac.th'],
    city: ['พิษณุโลก', 'เชียงใหม่', 'ภูเก็ต'], activity: ['วิ่ง', 'ว่ายน้ำ', 'ปั่นจักรยาน'],
  };
  const NUM = { year: { Student: [1, 3, 2], Car: [2020, 2023, 2018] }, stock: [12, 40, 7], age: [3, 1, 8], credits: [3, 3, 1], durationSec: [266, 254, 295], minutes: [15, 45, 30], stars: [4, 5, 3], gpa: [3.25, 3.8, 2.75], rating: [8.8, 8.4, 7.9], salary: [32000, 45000, 28500], calories: [520, 340, 610], pricePerNight: [1200, 2800, 950], price: [350, 120.5, 89] };
  function sampleRow(ent, i) {
    const o = {};
    ent.fields.forEach(([n, t, label]) => {
      const pick = (src) => Array.isArray(src) ? src[i % src.length] : src && src[ent.cls] ? src[ent.cls][i % src[ent.cls].length] : null;
      if (t === 'String') o[n] = pick(POOL[n]) || `${label || n} ${i + 1}`;
      else if (t === 'int') o[n] = Math.round(pick(NUM[n]) ?? (i * 7 + 3));
      else if (t === 'double') o[n] = pick(NUM[n]) ?? (i * 2.5 + 10);
      else if (t === 'bool') o[n] = i % 2 === 0;
      else o[n] = new Date(2026, 9, 10 + i * 3);
    });
    return o;
  }
  const dartDouble = v => Number.isInteger(v) ? v.toFixed(1) : String(v);
  const dmy = d => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00.000`;
  function showVal(t, v) { return t === 'double' ? dartDouble(v) : t === 'bool' ? (v ? 'ใช่' : 'ไม่') : t === 'DateTime' ? dmy(v) : String(v); }
  function dartLit(t, v) { return t === 'String' ? `'${v}'` : t === 'double' ? dartDouble(v) : t === 'DateTime' ? `DateTime(${iso(v).slice(0, 10)})` : String(v); }
  function sqlVal(t, v) { return t === 'String' ? `'${v}'` : t === 'double' ? dartDouble(v) : t === 'bool' ? (v ? 1 : 0) : t === 'DateTime' ? `'${iso(v)}'` : String(v); }

  /* ---------------- hero ---------------- */
  const heroSVG = `<svg viewBox="0 0 470 330" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="18" y="14" width="150" height="300" rx="24"/>
    <rect x="34" y="40" width="118" height="22" rx="6" fill="currentColor" fill-opacity=".18" stroke="none"/>
    <g stroke-opacity=".9"><line x1="36" y1="88" x2="120" y2="88"/><line x1="36" y1="100" x2="98" y2="100" stroke-opacity=".5"/>
    <line x1="36" y1="128" x2="128" y2="128"/><line x1="36" y1="140" x2="92" y2="140" stroke-opacity=".5"/>
    <line x1="36" y1="168" x2="112" y2="168"/><line x1="36" y1="180" x2="100" y2="180" stroke-opacity=".5"/></g>
    <circle cx="140" cy="276" r="15"/><path d="M134 276h12M140 270v12"/>
    <rect x="212" y="122" width="116" height="74" rx="16"/>
    <text x="270" y="166" text-anchor="middle" fill="currentColor" stroke="none" font-size="17" font-weight="600">Provider</text>
    <path d="M176 140 C192 140 196 146 206 148"/><path d="M200 143l7 5-8 3"/>
    <path d="M206 176 C196 178 190 182 176 184" stroke-dasharray="4 5"/>
    <path d="M334 150 C350 150 352 150 364 150"/><path d="M358 145l7 5-7 5"/>
    <path d="M364 170 C352 170 350 170 334 170" stroke-dasharray="4 5"/>
    <ellipse cx="410" cy="112" rx="44" ry="13"/><path d="M366 112v96c0 7 20 13 44 13s44-6 44-13v-96"/>
    <path d="M366 144c0 7 20 13 44 13s44-6 44-13M366 176c0 7 20 13 44 13s44-6 44-13" stroke-opacity=".5"/>
    <text x="410" y="246" text-anchor="middle" fill="currentColor" stroke="none" font-size="15" font-weight="500">SQLite</text>
    <text x="93" y="236" text-anchor="middle" fill="currentColor" stroke="none" font-size="14" font-weight="500">หน้าจอ</text>
  </svg>`;

  /* ---------------- learn view ---------------- */
  function learnShell() {
    return `
    <section class="hero"><div class="wrap">
      <div>
        <h1>เขียนแอป CRUD ด้วย Flutter + SQLite ให้ทันสอบพรุ่งนี้</h1>
        <p>quiz พรุ่งนี้ให้เขียนแอปเพิ่ม ดู แก้ ลบข้อมูลของ entity ที่อาจารย์กำหนด เว็บนี้สอนจากศูนย์ เริ่มจากแผนการอ่านด้านล่าง</p>
        <div class="ctas"><a class="btn btn-light" href="#learn" data-go="sec-path">เริ่มเรียน <i class="ph ph-arrow-down"></i></a><a class="btn btn-ghost" href="#practice">ไปฝึก</a></div>
      </div>
      <div>${heroSVG}</div>
    </div></section>
    <div class="entbar"><div class="wrap">
      <label>Entity</label>
      <div class="chips" id="chips"></div>
      <div class="mode" id="mode">
        <button data-mode="lab">Provider ถือ DB</button>
        <button data-mode="helper">มี DatabaseHelper</button>
      </div>
    </div></div>
    <main class="wrap">
      <div class="lesson" id="sec-path"></div>
      <div class="lesson" id="sec-flow"></div>
      <div class="lesson" id="sec-map"></div>
      <div class="lesson" id="sec-dart"></div>
      <div class="lesson" id="sec-files"></div>
      <div class="lesson" id="sec-multi"></div>
    </main>`;
  }

  function renderChips() {
    const ents = Gen.ENTITIES.map(e => `<button class="chip" data-ent="${e.cls}" aria-pressed="${state.entKey === e.cls}">${e.cls}</button>`);
    if (state.custom) ents.unshift(`<button class="chip" data-ent="__custom" aria-pressed="${state.entKey === '__custom'}">${esc(state.custom.cls)} (ของฉัน)</button>`);
    $('#chips').innerHTML = `<button class="chip add" id="mk"><i class="ph ph-plus"></i> ของตัวเอง</button>` + ents.join('');
    $$('#mode button').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === state.mode));
    const on = $('#chips [aria-pressed="true"]'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function nextBtn(id, title, sub) {
    return `<button class="next" data-go="${id}"><div>${title}<span>${sub}</span></div><i class="ph ph-arrow-down"></i></button>`;
  }

  function renderEntity() {
    const ent = currentEnt();
    const { n, files } = Gen.build(ent, state.mode);
    renderChips();
    renderPath(n);
    renderFlow(ent, n);
    renderMap(n);
    renderFiles(n, files);
    renderMulti(n);
  }

  /* ---- section: reading path ---- */
  function pathSteps(n) {
    const helper = state.mode === 'helper';
    return [
      ['sec-flow', 'เล่นแอปจำลอง ดูว่าต้องทำแอปแบบไหน', 'กด + เพิ่ม แตะแถวเพื่อแก้ กดถังขยะ แล้วดูว่าข้อมูลไปอยู่ไหน', 10],
      ['sec-map', 'ดูภาพรวม 4 ชั้นของแอป', 'หน้าจอ, Provider, Model, SQLite ใครคุยกับใคร', 5],
      ['sec-dart', 'ปูพื้น Dart และ Flutter', 'ถ้าเคยเขียน Dart แล้ว ข้ามได้', 20],
      ['file-model', `เขียน Model: คลาส ${n.C}`, 'ฟิลด์, toMap, fromMap และการแปลงชนิดข้อมูล', 15],
      ...(helper ? [['file-helper', 'เขียน DatabaseHelper', 'เปิดฐานข้อมูล, CREATE TABLE, CRUD', 20]] : []),
      ['file-provider', `เขียน ${n.Prov}`, helper ? 'ถือรายการและเรียก helper' : 'เปิดฐานข้อมูล, CREATE TABLE, CRUD และ notifyListeners', helper ? 10 : 25],
      ['file-main', 'ลงทะเบียน provider ใน main.dart', 'สั้นสุดแต่ลืมบ่อยสุด', 5],
      ['file-list', 'เขียนหน้ารายการ', 'Consumer, ListView.builder, ปุ่มลบ, ปุ่ม +', 15],
      ['file-form', 'เขียนหน้าฟอร์ม', 'Form, validator, ใช้หน้าเดียวทั้งเพิ่มและแก้', 25],
      ['sec-multi', 'ต่อเข้ากับโปรเจกต์ที่อาจารย์ให้', 'MultiProvider และไฟล์ .db แยก', 5],
      ['practice:fill', 'ฝึกเติมโค้ด อย่างน้อย 5 รอบ', 'แท็บ ฝึก กดสุ่มใหม่ไปเรื่อยๆ', 20],
      ['practice:quiz', 'ทำควิซ 20 ข้อ', 'ข้อไหนผิด กลับไปอ่านไฟล์นั้นซ้ำ', 15],
      ['exam', 'ก่อนนอน: อ่านแท็บ วันสอบ', 'ขั้นตอน git, การแบ่งเวลา, error ที่เจอบ่อย', 10],
    ];
  }
  function renderPath(n) {
    const steps = pathSteps(n), done = store.get('done', {});
    const total = steps.reduce((a, s) => a + s[3], 0);
    const left = steps.filter(s => !done[s[0]]).reduce((a, s) => a + s[3], 0);
    const cnt = steps.filter(s => done[s[0]]).length;
    const first = steps.find(s => !done[s[0]]);
    $('#sec-path').innerHTML = `<div class="card">
      <h2>อ่านตามลำดับนี้ ทั้งหมดประมาณ ${Math.round(total / 60 * 2) / 2} ชั่วโมง</h2>
      <p class="lede">กดที่หัวข้อเพื่อไปอ่าน อ่านจบแล้วติ๊กวงกลมด้านขวา เว็บจะจำไว้ให้ เปิดใหม่ก็ทำต่อได้ ถ้าเวลาน้อย ทำข้อ 1, ข้อที่เป็นการเขียนไฟล์ และฝึกเติมโค้ดก็พอ</p>
      <ol class="route">${steps.map((s, i) => `<li class="${done[s[0]] ? 'done' : ''}">
        <button class="pgo" data-jump="${s[0]}"><span class="pn">${i + 1}</span><span class="pt"><b>${esc(s[1])}</b><span>${esc(s[2])}</span></span><span class="pm">${s[3]} นาที</span></button>
        <label class="pck" aria-label="อ่านจบแล้ว"><input type="checkbox" data-done="${s[0]}" ${done[s[0]] ? 'checked' : ''}><i class="ph ph-check"></i></label>
      </li>`).join('')}</ol>
      <div class="pfoot"><span>เสร็จ ${cnt} จาก ${steps.length}${cnt < steps.length ? `, เหลือประมาณ ${left} นาที` : ''}</span>
      ${first ? `<button class="btn btn-acc" data-jump="${first[0]}">${cnt ? 'อ่านต่อ' : 'เริ่มข้อ 1'}: ${esc(first[1])} <i class="ph ph-arrow-right"></i></button>` : '<b>ครบทุกข้อแล้ว พร้อมสอบ</b>'}</div>
    </div>`;
    $$('[data-done]', $('#sec-path')).forEach(cb => cb.onchange = () => {
      const d = store.get('done', {}); d[cb.dataset.done] = cb.checked; store.set('done', d); renderPath(n);
    });
  }

  /* ---- section: map ---- */
  function renderMap(n) {
    const box = (go, title, sub, ch) => `<button class="mbox" data-go="${go}"><b class="mono">${title}</b><span>${sub}</span><em>${ch}</em></button>`;
    const lane = (down, up) => `<div class="lane"><div><i class="ph ph-arrow-down"></i><span>${down}</span></div><div><i class="ph ph-arrow-up"></i><span>${up}</span></div></div>`;
    $('#sec-map').innerHTML = `<div class="card">
      <h2>ไฟล์ไหนคุยกับไฟล์ไหน</h2>
      <p class="lede">ทั้งแอปมีแค่ 4 ชั้น คำสั่งไหลลง ผลลัพธ์ไหลขึ้น แตะกล่องเพื่อกระโดดไปดูโค้ดของไฟล์นั้น</p>
      <div class="panel map">
        <div class="mwrap">
          ${box('file-main', 'main.dart', `ห่อทั้งแอปด้วย ChangeNotifierProvider ทุกหน้าจอเลยเห็น ${n.Prov}`, 'บท 10, 11')}
          <div class="row2">
            ${box('file-list', n.List, 'Consumer ฟัง provider แล้วแสดง ListView', 'บท 11')}
            <div class="side"><i class="ph ph-arrows-left-right"></i>Navigator.push / pop<br><small>บท 9</small></div>
            ${box('file-form', n.Form, 'Form + TextFormField + validator', 'บท 8')}
          </div>
          ${lane(`<code>context.read&lt;${n.Prov}&gt;()</code> สั่ง ${n.add}, ${n.update}, ${n.del}`, `<code>notifyListeners()</code> แล้ว Consumer วาดใหม่`)}
          ${box('file-provider', n.Prov, `ChangeNotifier ที่ถือ List&lt;${n.C}&gt; ไว้ในหน่วยความจำ`, 'บท 10, 13')}
          ${lane(`<code>${n.c}.toMap()</code> ออบเจกต์เป็น Map`, `<code>${n.C}.fromMap(row)</code> Map เป็นออบเจกต์`)}
          ${box('file-model', n.C, 'คลาส model: ฟิลด์ + toMap + fromMap', 'บท 13.7')}
          ${lane('<code>insert</code> <code>update</code> <code>delete</code>', '<code>query</code> คืน List&lt;Map&gt;')}
          ${box(state.mode === 'helper' ? 'file-helper' : 'file-provider', `SQLite: ${n.db}`, `ไฟล์ในเครื่อง มีตาราง ${n.table} อยู่รอดแม้ปิดแอป`, 'บท 13')}
        </div>
      </div>
      ${nextBtn('sec-dart', 'ต่อไป: พื้นฐาน Dart ที่ต้องใช้', 'อ่าน 10 นาที ถ้าไม่เคยเขียน Dart มาก่อน')}
    </div>`;
  }

  /* ---- section: flow lab ---- */
  const lab = { db: [], mem: [], screen: 'list', editing: null, nextId: 1, busy: false, appOn: true, ent: null, n: null, errs: {} };
  function renderFlow(ent, n) {
    Object.assign(lab, { ent, n, screen: 'list', editing: null, busy: false, appOn: true, errs: {} });
    lab.db = [0, 1].map(i => ({ id: i + 1, ...sampleRow(ent, i) }));
    lab.nextId = 3;
    lab.mem = lab.db.slice().reverse().map(r => ({ ...r }));
    $('#sec-flow').innerHTML = `<div class="card">
      <h2>แอปที่ต้องทำ: เพิ่ม ดู แก้ ลบ ${n.th} แล้วข้อมูลต้องอยู่รอดหลังปิดแอป</h2>
      <p class="lede">นี่คือแอปจำลองที่ทำงานเหมือนของจริง ลองกด + เพิ่ม แตะแถวเพื่อแก้ กดถังขยะเพื่อลบ แล้วดูทางขวาว่าแต่ละปุ่มไปเรียกโค้ดอะไร และข้อมูลไปอยู่ตรงไหน</p>
      <div class="panel"><div class="lab">
        <div class="phone"><div class="screen" id="scr"></div></div>
        <div class="lab-side">
          <div class="box2" id="bx-prov"><h4><i class="ph ph-cpu"></i>${n.Prov} (ในหน่วยความจำ RAM)</h4><div class="mem" id="mem"></div></div>
          <div class="box2" id="bx-db"><h4><i class="ph ph-database"></i>SQLite: ตาราง ${n.table} ในไฟล์ ${n.db}</h4><div class="dbwrap" id="dbt"></div></div>
          <div class="box2" id="bx-log"><h4><i class="ph ph-list-numbers"></i>โค้ดที่ทำงาน ตามลำดับ</h4><ol class="log" id="log"><li class="on"><span class="d"></span><span>ยังไม่มีอะไรทำงาน ลองกดปุ่มในมือถือดู</span></li></ol></div>
        </div>
      </div>
      <div class="labbtns">
        <button class="btn btn-soft" id="lab-restart"><i class="ph ph-arrow-clockwise"></i>ปิดแอปแล้วเปิดใหม่</button>
        <button class="btn btn-soft" id="lab-wipe"><i class="ph ph-trash-simple"></i>ถอนการติดตั้งแอป</button>
      </div></div>
      ${nextBtn('sec-map', 'ต่อไป: ภาพรวมว่าไฟล์ไหนคุยกับไฟล์ไหน', '4 ชั้น ที่ทุกแอป CRUD มีเหมือนกัน')}
    </div>`;
    drawPhone(); drawMem(); drawDb();
    $('#lab-restart').onclick = () => runRestart(false);
    $('#lab-wipe').onclick = () => runRestart(true);
  }

  function rowSub(r) {
    const F = lab.ent.fields; const t = F.find(f => f[1] === 'String') || F[0];
    return { title: showVal(t[1], r[t[0]]), sub: F.filter(f => f !== t).map(([nm, ty, lb]) => `${lb || nm}: ${showVal(ty, r[nm])}`).join('  ') };
  }
  function drawPhone() {
    const n = lab.n, s = $('#scr'); if (!s) return;
    s.classList.toggle('busy', lab.busy);
    if (!lab.appOn) { s.innerHTML = `<div class="empty" style="background:#101413;color:#8c9894">แอปถูกปิดอยู่</div>`; return; }
    if (lab.screen === 'list') {
      s.innerHTML = `<div class="appbar">รายการ${esc(n.th)}</div>` + (lab.mem.length ? `<div class="lst">${lab.mem.map(r => {
        const v = rowSub(r);
        return `<div class="tile" data-id="${r.id}"><div class="tt"><div class="t1">${esc(v.title)}</div><div class="t2">${esc(v.sub)}</div></div><button data-del="${r.id}" aria-label="ลบ"><i class="ph ph-trash"></i></button></div>`;
      }).join('')}</div>` : `<div class="empty">ยังไม่มี${esc(n.th)}</div>`) + `<button class="fab" aria-label="เพิ่ม"><i class="ph ph-plus"></i></button>`;
      $$('.tile', s).forEach(t => t.onclick = e => { if (e.target.closest('[data-del]') || lab.busy) return; openForm(lab.mem.find(r => r.id === +t.dataset.id)); });
      $$('[data-del]', s).forEach(b => b.onclick = () => !lab.busy && runDelete(+b.dataset.del));
      $('.fab', s).onclick = () => !lab.busy && openForm(null);
      return;
    }
    const ed = lab.editing;
    s.innerHTML = `<div class="appbar"><button id="back" aria-label="กลับ"><i class="ph ph-arrow-left"></i></button>${ed ? 'แก้ไข' : 'เพิ่ม'}${esc(n.th)}</div><div class="frm">${lab.ent.fields.map(([nm, ty, lb]) => {
      const v = ed ? ed[nm] : null; const err = lab.errs[nm];
      if (ty === 'bool') return `<label class="sw">${esc(lb)}<input type="checkbox" data-f="${nm}" ${v ? 'checked' : ''}></label>`;
      if (ty === 'DateTime') return `<div class="fld"><label>${esc(lb)}</label><input type="date" data-f="${nm}" value="${iso(v || new Date()).slice(0, 10)}"></div>`;
      return `<div class="fld ${err ? 'err' : ''}"><label>${esc(lb)}</label><input type="text" data-f="${nm}" inputmode="${ty === 'String' ? 'text' : 'decimal'}" value="${v == null ? '' : esc(ty === 'double' ? dartDouble(v) : v)}"><div class="msg">${err ? esc(err) : ''}</div></div>`;
    }).join('')}<button class="save" id="save">บันทึก</button></div>`;
    $('#back').onclick = () => { if (lab.busy) return; lab.screen = 'list'; lab.errs = {}; drawPhone(); log([{ html: '<code>Navigator.pop(context)</code> กดย้อนกลับ ไม่ได้บันทึกอะไร' }]); };
    $('#save').onclick = () => !lab.busy && runSave();
  }
  function drawMem(flashId) {
    const n = lab.n, el = $('#mem'); if (!el) return;
    if (!lab.appOn) { el.innerHTML = `<span class="c">// แอปปิดอยู่ ไม่มีอะไรใน RAM</span>`; return; }
    el.innerHTML = `_${n.p} = [\n` + lab.mem.map(r => {
      const s = `  ${n.C}(id: ${r.id}, ${lab.ent.fields.map(([nm, ty]) => `${nm}: ${dartLit(ty, r[nm])}`).join(', ')}),`;
      return r.id === flashId ? `<span class="flash">${esc(s)}</span>` : esc(s);
    }).join('\n') + (lab.mem.length ? '\n' : '') + ']';
  }
  function drawDb(flashId) {
    const el = $('#dbt'); if (!el) return;
    const F = lab.ent.fields;
    if (lab.db === null) { el.innerHTML = `<span class="c" style="font-family:var(--mono);font-size:13px">// ไม่มีไฟล์ ${lab.n.db} (ถูกลบไปกับแอป)</span>`; return; }
    el.innerHTML = `<table class="dbt"><tr><th>id</th>${F.map(f => `<th>${f[0]}</th>`).join('')}</tr>${lab.db.map(r => `<tr class="${r.id === flashId ? 'flash' : ''}"><td>${r.id}</td>${F.map(([nm, ty]) => `<td>${esc(String(sqlVal(ty, r[nm])).replace(/^'|'$/g, ''))}</td>`).join('')}</tr>`).join('')}</table>` + (lab.db.length ? '' : `<span class="c" style="font-family:var(--mono);font-size:13px">// ตารางว่าง</span>`);
  }
  function lit(which) { ['prov', 'db', 'log'].forEach(k => $('#bx-' + k)?.classList.toggle('lit', k === which)); }
  let logRun = 0;
  async function log(steps) {
    const run = ++logRun; lab.busy = true; drawPhone();
    const ol = $('#log'); ol.innerHTML = steps.map(s => `<li><span class="d"></span><span>${s.html}</span></li>`).join('');
    const lis = $$('li', ol);
    for (let i = 0; i < steps.length; i++) {
      if (run !== logRun) return;
      lis[i].classList.add('on'); lit(steps[i].who);
      if (steps[i].fn) steps[i].fn();
      await sleep(steps.length > 1 ? 650 : 0);
    }
    lit(null); lab.busy = false; drawPhone();
  }
  function openForm(item) {
    lab.editing = item; lab.screen = 'form'; lab.errs = {};
    const n = lab.n;
    log(item ? [
      { html: `แตะแถว: <code>Navigator.push(context, MaterialPageRoute(builder: (context) =&gt; ${n.Form}(${n.c}: ${n.c})))</code>` },
      { html: `<code>initState()</code> เห็นว่า <code>widget.${n.c} != null</code> เลยเติมค่าเดิมลงทุกช่อง (โหมดแก้ไข)` },
    ] : [
      { html: `กด +: <code>Navigator.push(context, MaterialPageRoute(builder: (context) =&gt; const ${n.Form}()))</code>` },
      { html: `ไม่ได้ส่ง ${n.c} มา <code>widget.${n.c}</code> เป็น null แปลว่าโหมดเพิ่มใหม่` },
    ]);
  }
  function readForm() {
    const out = {}, errs = {};
    lab.ent.fields.forEach(([nm, ty, lb]) => {
      const el = $(`#scr [data-f="${nm}"]`);
      if (ty === 'bool') out[nm] = el.checked;
      else if (ty === 'DateTime') { const [y, m, d] = (el.value || iso(new Date()).slice(0, 10)).split('-').map(Number); out[nm] = new Date(y, m - 1, d); }
      else {
        const v = el.value.trim();
        if (ty === 'String') { if (!v) errs[nm] = `กรุณากรอก${lb}`; out[nm] = v; }
        else {
          const num = Number(v);
          if (!v || Number.isNaN(num) || (ty === 'int' && !Number.isInteger(num))) errs[nm] = `กรุณากรอก${lb}เป็นตัวเลข`;
          out[nm] = num;
        }
      }
    });
    return { out, errs };
  }
  function runSave() {
    const n = lab.n, { out, errs } = readForm();
    if (Object.keys(errs).length) {
      lab.errs = errs; lab.editing = { ...(lab.editing || {}), ...out };
      log([{ who: null, html: `<code>_formKey.currentState!.validate()</code> ได้ <b>false</b> เพราะ validator บางช่องคืนข้อความ error เลย return ออก ไม่มีอะไรถูกบันทึก` }]);
      return;
    }
    lab.errs = {};
    const isEdit = lab.editing && lab.editing.id;
    const id = isEdit ? lab.editing.id : lab.nextId;
    const F = lab.ent.fields;
    const obj = `${n.C}(id: ${isEdit ? id : 'null'}, ${F.map(([nm, ty]) => `${nm}: ${esc(dartLit(ty, out[nm]))}`).join(', ')})`;
    const mapStr = `{${isEdit ? `'id': ${id}, ` : ''}${F.map(([nm, ty]) => `'${nm}': ${esc(String(sqlVal(ty, out[nm])))}`).join(', ')}}`;
    const steps = [
      { who: null, html: `<code>validate()</code> ได้ true ทุกช่องผ่าน` },
      { who: null, html: `สร้างออบเจกต์ <code>${obj}</code>` },
      { who: 'prov', html: `<code>context.read&lt;${n.Prov}&gt;().${isEdit ? n.update : n.add}(${n.c})</code>` },
      { who: 'prov', html: `<code>${n.c}.toMap()</code> ได้ <code>${mapStr}</code>${isEdit ? '' : ' (ไม่มี id เพราะยังเป็น null)'}` },
      isEdit
        ? { who: 'db', html: `<code>UPDATE ${n.table} SET ... WHERE id = ?</code> โดย whereArgs = [${id}]`, fn: () => { const i = lab.db.findIndex(r => r.id === id); lab.db[i] = { id, ...out }; drawDb(id); } }
        : { who: 'db', html: `<code>INSERT INTO ${n.table} (${F.map(f => f[0]).join(', ')}) VALUES (...)</code> SQLite ออก id ใหม่ = ${id}`, fn: () => { lab.db.push({ id, ...out }); lab.nextId++; drawDb(id); } },
      { who: 'db', html: `<code>${n.fetch}()</code> เรียก <code>query('${n.table}', orderBy: 'id DESC')</code> ได้ List&lt;Map&gt; กลับมา` },
      { who: 'prov', html: `<code>${n.C}.fromMap(row)</code> ทุกแถว แล้วเก็บลง <code>_${n.p}</code>`, fn: () => { lab.mem = lab.db.slice().sort((a, b) => b.id - a.id).map(r => ({ ...r })); drawMem(id); } },
      { who: 'prov', html: `<code>notifyListeners()</code> ประกาศว่าข้อมูลเปลี่ยนแล้ว` },
      { who: null, html: `<code>Navigator.pop(context)</code> ปิดฟอร์ม กลับหน้ารายการ`, fn: () => { lab.screen = 'list'; lab.editing = null; } },
      { who: null, html: `<code>Consumer&lt;${n.Prov}&gt;</code> ได้ยิน เลยเรียก builder ใหม่ หน้ารายการแสดงข้อมูลล่าสุด` },
    ];
    log(steps);
  }
  function runDelete(id) {
    const n = lab.n;
    log([
      { who: 'prov', html: `กดถังขยะ: <code>provider.${n.del}(${id})</code>` },
      { who: 'db', html: `<code>DELETE FROM ${n.table} WHERE id = ?</code> โดย whereArgs = [${id}]`, fn: () => { lab.db = lab.db.filter(r => r.id !== id); drawDb(); } },
      { who: 'db', html: `<code>${n.fetch}()</code> query ตารางใหม่` },
      { who: 'prov', html: `fromMap ทุกแถว แล้ว <code>notifyListeners()</code>`, fn: () => { lab.mem = lab.mem.filter(r => r.id !== id); drawMem(); } },
      { who: null, html: `Consumer วาดรายการใหม่ แถวที่ลบหายไป` },
    ]);
  }
  function runRestart(wipe) {
    const n = lab.n;
    const steps = [
      { who: 'prov', html: `ปิดแอป: ทุกอย่างใน RAM หายหมด รวมถึง <code>_${n.p}</code>`, fn: () => { lab.appOn = false; lab.mem = []; lab.screen = 'list'; drawMem(); } },
      wipe
        ? { who: 'db', html: `ถอนการติดตั้ง: ไฟล์ <code>${n.db}</code> ถูกลบไปพร้อมแอป ข้อมูลหายจริง`, fn: () => { lab.db = null; drawDb(); } }
        : { who: 'db', html: `แต่ไฟล์ <code>${n.db}</code> ยังอยู่ในเครื่อง ข้อมูลยังอยู่ครบ` },
      { who: null, html: `เปิดแอป: <code>main()</code> เรียก <code>runApp(ChangeNotifierProvider(create: (context) =&gt; ${n.Prov}(), ...))</code>`, fn: () => { lab.appOn = true; } },
      { who: 'prov', html: `constructor <code>${n.Prov}()</code> เรียก <code>${n.fetch}()</code>` },
      wipe
        ? { who: 'db', html: `<code>openDatabase</code> ไม่เจอไฟล์ เลยสร้างใหม่และเรียก <code>onCreate</code>: <code>CREATE TABLE ${n.table} (...)</code>`, fn: () => { lab.db = []; lab.nextId = 1; drawDb(); } }
        : { who: 'db', html: `<code>openDatabase</code> เจอไฟล์เดิม <b>onCreate ไม่ถูกเรียก</b> (มันทำงานแค่ตอนสร้างไฟล์ครั้งแรก)` },
      { who: 'db', html: `<code>query('${n.table}', orderBy: 'id DESC')</code>` },
      { who: 'prov', html: `fromMap ทุกแถวเก็บลง <code>_${n.p}</code> แล้ว <code>notifyListeners()</code>`, fn: () => { lab.mem = (lab.db || []).slice().sort((a, b) => b.id - a.id).map(r => ({ ...r })); drawMem(); } },
      { who: null, html: wipe ? 'หน้ารายการว่างเปล่า เพราะเป็นฐานข้อมูลใหม่' : 'หน้ารายการกลับมาเหมือนเดิม นี่คือ data persistence' },
    ];
    log(steps);
  }

  /* ---- section: dart primer ---- */
  const PRIMER = [
    ['class และ constructor', 'คลาสคือแม่พิมพ์ ออบเจกต์คือของที่ปั๊มออกมา named parameter ต้องเขียนชื่อกำกับตอนสร้าง และ required บังคับว่าต้องส่ง',
      `class Pet {
  final String name;
  final int age;
  Pet({required this.name, required this.age});
}

final p = Pet(name: 'ส้มโอ', age: 3);
print(p.name); // ส้มโอ`],
    ['null: ? ! ?.', 'ชนิดที่มี ? ต่อท้ายเป็น null ได้ ! คือยืนยันว่าไม่ null (ถ้าผิดแอปพัง) ส่วน ?. คือเข้าถึงแบบปลอดภัย ถ้าซ้ายเป็น null ผลก็เป็น null',
      `int? id;            // ตอนนี้เป็น null
id = 5;
int x = id!;        // ยืนยันว่าไม่ null

Pet? pet;           // ยังไม่มีสัตว์
print(pet?.name);   // null ไม่พัง`],
    ['Map และ List', 'Map คือคู่ key กับ value (ฐานข้อมูลส่งแถวมาเป็น Map) List คือรายการ .map() แปลงทุกตัว แล้ว .toList() ให้กลับเป็น List',
      `Map<String, dynamic> row = {'id': 1, 'name': 'ส้มโอ'};
print(row['name']);  // ส้มโอ

List<int> nums = [1, 2, 3];
List<int> doubled = nums.map((x) => x * 2).toList();
List<int> copy = [...nums]; // สำเนา`],
    ['Future, async, await', 'งานที่ต้องรอ (อ่านเขียนฐานข้อมูล) คืนค่าเป็น Future ฟังก์ชันที่จะรอได้ต้องมี async และใส่ await หน้าคำสั่งที่ต้องรอ ถ้าลืม await บรรทัดถัดไปจะทำงานก่อนงานเสร็จ',
      `Future<void> addPet() async {
  await db.insert('pets', {'name': 'ส้มโอ'});
  print('บันทึกเสร็จแล้ว'); // รอ insert เสร็จก่อน
}`],
    ['Widget, Stateless, Stateful', 'ทุกอย่างบนจอคือ widget ซ้อนกันเป็นต้นไม้ StatelessWidget ไม่จำค่าอะไร StatefulWidget มีคลาส State ที่จำค่าได้ และเรียก setState เมื่อค่าเปลี่ยนเพื่อให้วาดใหม่',
      `class Counter extends StatefulWidget {
  const Counter({super.key});
  @override
  State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int count = 0;
  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: () => setState(() => count++),
      child: Text('กดแล้ว $count ครั้ง'),
    );
  }
}`],
    ['Provider 4 ตัวที่ต้องรู้', 'ChangeNotifier คือคนถือข้อมูลและประกาศ ChangeNotifierProvider วางไว้บนสุดของแอป Consumer หรือ context.watch คือคนฟัง (วาดใหม่เมื่อมีประกาศ) context.read คือหยิบมาสั่งงานเฉยๆ ไม่ฟัง ใช้ในปุ่ม',
      `class CounterProvider with ChangeNotifier {
  int count = 0;
  void inc() { count++; notifyListeners(); }
}

// ฟัง: วาดใหม่ทุกครั้งที่ notifyListeners
Consumer<CounterProvider>(
  builder: (context, p, child) => Text('\${p.count}'),
)

// สั่งงาน: ใช้ในปุ่ม
onPressed: () => context.read<CounterProvider>().inc(),`],
    ['Navigator: push และ pop', 'หน้าจอซ้อนกันเป็นกอง push วางหน้าใหม่ทับ pop เอาหน้าบนสุดออก ส่งข้อมูลไปหน้าใหม่ผ่าน constructor',
      `Navigator.push(
  context,
  MaterialPageRoute(builder: (context) => PetFormScreen(pet: pet)),
);

Navigator.pop(context); // ปิดหน้านี้ กลับหน้าก่อน`],
    ['Form และ validator', 'Form ห่อช่องกรอกทั้งหมด GlobalKey<FormState> คือรีโมตสั่ง validate() TextFormField แต่ละช่องมี validator: คืน null แปลว่าผ่าน คืนข้อความแปลว่าไม่ผ่าน',
      `final _formKey = GlobalKey<FormState>();
final _nameController = TextEditingController();

Form(
  key: _formKey,
  child: TextFormField(
    controller: _nameController,
    validator: (value) {
      if (value == null || value.isEmpty) return 'กรุณากรอกชื่อ';
      return null;
    },
  ),
)

if (_formKey.currentState!.validate()) { /* บันทึก */ }`],
    ['SQL 5 คำสั่ง กับเมธอดของ sqflite', 'sqflite มีเมธอดที่เขียน SQL ให้ เราแค่ส่งชื่อตารางกับ Map ไป แต่ต้องรู้ว่าแต่ละเมธอดคือ SQL คำสั่งอะไร',
      `// CREATE TABLE pets (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)
await db.execute('CREATE TABLE ...');

// INSERT INTO pets (name) VALUES ('ส้มโอ')
await db.insert('pets', {'name': 'ส้มโอ'});

// SELECT * FROM pets ORDER BY id DESC
await db.query('pets', orderBy: 'id DESC');

// UPDATE pets SET name = 'มะลิ' WHERE id = 1
await db.update('pets', {'name': 'มะลิ'}, where: 'id = ?', whereArgs: [1]);

// DELETE FROM pets WHERE id = 1
await db.delete('pets', where: 'id = ?', whereArgs: [1]);`],
  ];
  function renderPrimer() {
    $('#sec-dart').innerHTML = `<div class="card">
      <h2>พื้นฐาน Dart และ Flutter ที่โค้ดข้างล่างใช้</h2>
      <p class="lede">ถ้ายังไม่เคยเขียน อ่านให้ครบ 9 ข้อนี้ก่อน ถ้าเคยแล้วข้ามไปดูไฟล์ได้เลย ทุกตัวอย่างใช้สัตว์เลี้ยง (Pet) เพื่อแยกจาก entity ที่เลือกไว้ด้านบน</p>
      <div class="grid2">${PRIMER.map(([t, p, c]) => `<div class="mini"><h3>${esc(t)}</h3><p>${esc(p)}</p>${codeHTML(c)}</div>`).join('')}</div>
      ${nextBtn('sec-files', 'ต่อไป: เขียนทีละไฟล์', 'model, provider, main, หน้ารายการ, หน้าฟอร์ม')}
    </div>`;
  }

  /* ---- section: files ---- */
  const FILE_INFO = {
    model: ['เริ่มจาก Model: บอกว่า 1 รายการมีข้อมูลอะไร', 'ไฟล์แรกที่ต้องเขียน เพราะไฟล์อื่นทั้งหมดใช้คลาสนี้ เขียนเสร็จแล้วแอปยังไม่มีอะไรให้เห็น', 'บท 13.7'],
    helper: ['DatabaseHelper: ที่เดียวที่คุยกับฐานข้อมูล', 'เปิดไฟล์ .db สร้างตาราง และมีเมธอด CRUD ครบ provider จะเรียกใช้คลาสนี้', 'บท 13.4 ถึง 13.6'],
    provider: ['Provider: ผู้จัดการที่ถือข้อมูลและสั่งฐานข้อมูล', 'เมธอดเพิ่ม แก้ ลบ ทุกตัวจบด้วยการโหลดใหม่และ notifyListeners หน้าจอจึงอัปเดตเอง', 'บท 10, 13'],
    main: ['main.dart: ลงทะเบียน provider ไว้บนสุด', 'ขั้นนี้สั้นที่สุดแต่ลืมบ่อยที่สุด ถ้าไม่ลงทะเบียน ทุกหน้าจอจะหา provider ไม่เจอ', 'บท 10, 11'],
    list: ['หน้ารายการ: ฟัง provider แล้วแสดงทุกแถว', 'ครอบลิสต์ด้วย Consumer มีปุ่ม + ไปหน้าฟอร์ม แตะแถวไปแก้ และปุ่มลบในแต่ละแถว', 'บท 11, 9'],
    form: ['หน้าฟอร์ม: ใช้หน้าเดียวทั้งเพิ่มและแก้', 'ตรวจข้อมูลด้วย validator สร้างออบเจกต์ แล้วสั่ง provider บันทึก จากนั้น pop กลับ', 'บท 8, 9'],
  };
  function renderFiles(n, files) {
    const lead = state.mode === 'helper'
      ? 'แบบเนื้อหาหลักบท 13: DatabaseHelper (Singleton) คุยกับฐานข้อมูล ส่วน provider ถือรายการและเรียก helper ถ้าโปรเจกต์ตั้งต้นมีไฟล์ helpers/database_helper.dart ให้ใช้แบบนี้'
      : 'แบบปฏิบัติการบท 13 (แอปรายรับรายจ่าย): provider เปิดฐานข้อมูลและสั่ง SQL เอง ไฟล์น้อยกว่า ถ้าโปรเจกต์ตั้งต้นมี provider ที่ import sqflite อยู่แล้ว ให้ใช้แบบนี้';
    $('#sec-files').innerHTML = `<div class="card">
      <h2>เขียนทีละไฟล์ สำหรับ ${esc(n.C)} (${esc(n.th)})</h2>
      <p class="lede">${lead} ส่วนที่ไฮไลต์สีเขียวคือส่วนที่เปลี่ยนตาม entity ที่เหลือพิมพ์เหมือนเดิมทุกครั้ง</p>
      <div class="panel" style="padding:16px 20px"><b>ลำดับที่แนะนำ:</b> ${files.map((f, i) => `<a href="#learn" data-go="file-${f.key}">${i + 1}. ${f.title}</a>`).join('  ')}</div>
    </div>` + files.map((f, i) => {
      const [h, p, ch] = FILE_INFO[f.key];
      return `<div class="card file" id="file-${f.key}">
        <h2>${i + 1}. ${h}</h2>
        <p class="lede">${p}</p>
        <div class="filehead"><span class="path">${esc(f.path)}</span><span class="tag">${ch}</span><button class="copy" data-copy="${i}"><i class="ph ph-copy"></i>คัดลอกทั้งไฟล์</button></div>
        ${f.parts.map(pt => `<div class="part">${codeHTML(pt.code.replace(/^\n+/, ''))}<div class="note">${pt.note}</div></div>`).join('')}
        ${i < files.length - 1 ? nextBtn('file-' + files[i + 1].key, `ต่อไป: ${files[i + 1].title}`, files[i + 1].path) : nextBtn('sec-multi', 'ต่อไป: ถ้าโปรเจกต์มี provider อยู่แล้ว', 'MultiProvider และการเชื่อมหน้าใหม่เข้ากับหน้าเดิม')}
      </div>`;
    }).join('');
    $$('[data-copy]', $('#sec-files')).forEach(b => b.onclick = async () => {
      try { await navigator.clipboard.writeText(Gen.strip(files[+b.dataset.copy].code)); toast('คัดลอกแล้ว'); } catch (e) { toast('คัดลอกไม่ได้ในเบราว์เซอร์นี้'); }
    });
  }

  function renderMulti(n) {
    const multi = `void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (context) => TransactionProvider()), // ของเดิม
        ChangeNotifierProvider(create: (context) => \u0001${n.Prov}\u0002()), // เพิ่มของเรา
      ],
      child: const MyApp(),
    ),
  );
}`;
    const btn = `// ในหน้าเดิม (เช่นหน้าแรกของโปรเจกต์ตั้งต้น) เพิ่มปุ่มไปหน้าใหม่
IconButton(
  icon: const Icon(Icons.list),
  onPressed: () => Navigator.push(
    context,
    MaterialPageRoute(builder: (context) => const \u0001${n.List}\u0002()),
  ),
),`;
    $('#sec-multi').innerHTML = `<div class="card" id="multi">
      <h2>ถ้าโปรเจกต์ตั้งต้นมี provider กับตารางอยู่แล้ว</h2>
      <p class="lede">โจทย์จะให้โปรเจกต์ที่ใช้ DB + Provider มาก่อน ไม่ต้องลบของเดิม เพิ่มของเราเข้าไปข้างๆ 3 จุดนี้</p>
      <h3>1. ลงทะเบียนหลาย provider ด้วย MultiProvider</h3>
      <p>เปลี่ยน <code>ChangeNotifierProvider</code> ตัวเดียวใน main.dart เป็น <code>MultiProvider</code> แล้วใส่ทั้งของเดิมและของเรา (ชื่อ provider เดิมดูจาก main.dart ของโปรเจกต์)</p>
      ${codeHTML(multi)}
      <h3>2. ใช้ไฟล์ .db แยกของตัวเอง</h3>
      <p>เราตั้ง <code>${n.db}</code> เป็นไฟล์ใหม่ ไม่ปนกับไฟล์ของโปรเจกต์เดิม ข้อดีคือ <code>onCreate</code> จะทำงานแน่นอนตอนเปิดไฟล์ครั้งแรก ถ้าไปเพิ่มตารางลงในไฟล์ .db เดิมที่มีอยู่แล้ว onCreate จะไม่ถูกเรียก ตารางใหม่จะไม่ถูกสร้าง แล้วเจอ error <code>no such table</code> (ทางแก้คือถอนการติดตั้งแอปแล้วรันใหม่ หรือเพิ่ม version แล้วเขียน onUpgrade ตามบท 13.8)</p>
      <p>ถ้าใช้แบบ DatabaseHelper และโปรเจกต์มีไฟล์ <code>database_helper.dart</code> อยู่แล้ว ให้สร้างคลาสของเราชื่ออื่น เช่น <code>${n.C}DatabaseHelper</code> ในไฟล์ใหม่ จะได้ไม่ชนกัน</p>
      <h3>3. ทำทางเข้าไปหน้าใหม่</h3>
      <p>จะตั้งหน้ารายการของเราเป็น <code>home:</code> ใน MaterialApp เลยก็ได้ หรือเพิ่มปุ่มในหน้าเดิมให้ push ไปหน้าเรา</p>
      ${codeHTML(btn)}
      <button class="next" onclick="location.hash='#practice'"><div>เรียนครบแล้ว ไปฝึกต่อ<span>เติมโค้ดในช่องว่าง ควิซ และโจทย์จำลองแบบจับเวลา</span></div><i class="ph ph-arrow-right"></i></button>
    </div>`;
  }

  /* ---------------- practice view ---------------- */
  const QUIZ = [
    { q: 'เพิ่มคอลัมน์ใหม่ใน CREATE TABLE ของ onCreate แล้วกด hot restart แต่เจอ error ว่าไม่มีคอลัมน์นั้น เพราะอะไร', o: ['onCreate ทำงานเฉพาะตอนไฟล์ .db ถูกสร้างครั้งแรก ไฟล์เดิมมีอยู่แล้วจึงไม่ถูกเรียกอีก', 'ต้องเรียก notifyListeners หลัง CREATE TABLE', 'SQLite ไม่รองรับการเพิ่มคอลัมน์', 'ลืมใส่ await หน้า openDatabase'], a: 0, x: 'onCreate รันครั้งเดียวตอนสร้างไฟล์ ระหว่างพัฒนาให้ถอนการติดตั้งแอปแล้วรันใหม่ ถ้าแอปใช้งานจริงแล้วต้องเพิ่ม version และเขียน onUpgrade' },
    { q: 'กดบันทึกแล้วข้อมูลลงฐานข้อมูลจริง แต่หน้ารายการไม่เปลี่ยนจนกว่าจะปิดเปิดแอป สาเหตุที่น่าจะเป็นที่สุดคือ', o: ['ใช้ StatelessWidget กับหน้ารายการ', 'ใน provider ลืมเรียก notifyListeners() (หรือไม่ได้ fetch ใหม่หลัง insert)', 'ลืมใส่ AUTOINCREMENT', 'ใช้ context.read ในปุ่มบันทึก'], a: 1, x: 'Consumer จะวาดใหม่ก็ต่อเมื่อ provider เรียก notifyListeners() หลังเปลี่ยนรายการในหน่วยความจำ' },
    { q: 'โค้ด db.delete(\'books\') โดยไม่มี where จะเกิดอะไร', o: ['ลบแถวล่าสุด', 'error เพราะ where เป็นค่าบังคับ', 'ลบทุกแถวในตาราง books', 'ลบตาราง books ทิ้ง'], a: 2, x: 'where เป็นค่าไม่บังคับ ไม่ใส่ก็คือไม่มีเงื่อนไข ทุกแถวโดนลบ update ที่ไม่มี where ก็เขียนทับทุกแถวเหมือนกัน' },
    { q: 'ทำไมใช้ where: \'id = ?\' คู่กับ whereArgs: [id] แทนการเขียน \'id = $id\'', o: ['เร็วกว่า', 'ค่าใน whereArgs ถูกผูกเข้าไปเป็นข้อมูลเสมอ ไม่ถูกอ่านเป็นคำสั่ง SQL จึงกัน SQL Injection', 'เพราะ Dart ใช้ $ ในสตริงไม่ได้', 'whereArgs แปลงชนิดข้อมูลให้อัตโนมัติ'], a: 1, x: 'เครื่องหมาย ? เป็นช่องว่าง ค่าจริงถูกใส่ทีหลังในฐานะข้อมูล ข้อความแปลกๆ ที่ผู้ใช้พิมพ์จึงไม่กลายเป็นส่วนหนึ่งของคำสั่ง' },
    { q: 'ฟิลด์ bool isDone ควรเก็บใน SQLite แบบไหน', o: ['BOOLEAN', 'TEXT ค่า "true" / "false"', 'INTEGER ค่า 1 / 0 เขียนด้วย isDone ? 1 : 0 และอ่านกลับด้วย map[\'isDone\'] == 1', 'REAL'], a: 2, x: 'SQLite ไม่มีชนิด boolean sqflite รับได้แค่ตัวเลข ข้อความ และไบนารี' },
    { q: 'ฟิลด์ DateTime ควรแปลงอย่างไร', o: ['เก็บ DateTime ลงไปตรงๆ', 'toMap: date.toIso8601String() / fromMap: DateTime.parse(map[\'date\'] as String)', 'toMap: date.toString() / fromMap: map[\'date\'] as DateTime', 'เก็บเป็น BLOB'], a: 1, x: 'เก็บเป็น TEXT แบบ ISO 8601 อ่านง่ายและเรียงตามตัวอักษรได้ถูกลำดับเวลา (อีกทางคือ INTEGER millisecondsSinceEpoch)' },
    { q: 'ทำไม fromMap ของ double ถึงเขียน (map[\'price\'] as num).toDouble()', o: ['เพราะ SQLite ส่งค่าเป็น String', 'ถ้าค่าที่บันทึกเป็นเลขกลม เช่น 120 SQLite อาจคืนมาเป็น int ถ้า as double ตรงๆ จะพัง', 'เพื่อปัดเศษ', 'เพราะ REAL ใน SQLite คือ float'], a: 1, x: 'num เป็นแม่ของทั้ง int และ double cast เป็น num ก่อนแล้วค่อย toDouble() ปลอดภัยทั้งสองกรณี' },
    { q: 'ใน toMap() ทำไมต้องเขียน if (id != null) \'id\': id', o: ['เพื่อให้ insert เร็วขึ้น', 'ถ้าส่ง \'id\': null ไปกับ update จะเป็นการสั่งเปลี่ยนคีย์หลักเป็น null แล้ว error datatype mismatch', 'เพราะ Map ใส่ค่า null ไม่ได้', 'ไม่จำเป็น เขียนหรือไม่เขียนก็ได้ผลเหมือนกัน'], a: 1, x: 'ใส่ id เฉพาะเมื่อมีค่า toMap ตัวเดียวจึงใช้ได้ทั้ง insert (ไม่มี id ให้ AUTOINCREMENT ออกเลข) และ update' },
    { q: 'ในปุ่ม onPressed ที่สั่ง provider.addBook(...) ควรหยิบ provider ด้วยอะไร', o: ['context.watch<BookProvider>()', 'context.read<BookProvider>()', 'new BookProvider()', 'BookProvider.instance'], a: 1, x: 'read หยิบมาสั่งงานโดยไม่ลงทะเบียนฟัง watch ใช้ใน build เมื่ออยากให้วาดใหม่ตามข้อมูล ส่วนการ new ขึ้นมาใหม่จะได้คนละตัวกับที่หน้าจออื่นใช้' },
    { q: 'เปิดหน้ารายการแล้วเจอ ProviderNotFoundException แปลว่าอะไร', o: ['ตารางยังไม่ถูกสร้าง', 'ยังไม่ได้ลงทะเบียน provider ตัวนั้นใน main.dart (ChangeNotifierProvider หรือ MultiProvider)', 'ลืม import sqflite', 'ใช้ Consumer ผิดชนิด int'], a: 1, x: 'Consumer และ context.read หา provider จากบรรพบุรุษในต้นไม้ widget ถ้าไม่มีใครวางไว้ด้านบนก็หาไม่เจอ' },
    { q: 'ตั้งชื่อคลาส model ว่า Transaction แล้วคอมไพล์ไม่ผ่าน เพราะอะไร', o: ['ชื่อยาวเกินไป', 'sqflite มีคลาสชื่อ Transaction อยู่แล้ว ชื่อชนกัน', 'Dart ห้ามใช้ชื่อขึ้นต้นด้วย T', 'ต้องลงท้ายด้วย Model'], a: 1, x: 'ปฏิบัติการบท 13 จึงตั้งชื่อว่า MyTransaction ชื่ออื่นที่ชนกับ Flutter เช่น Card, Table, Route, Title ก็ต้องเลี่ยงเหมือนกัน' },
    { q: 'validator ของ TextFormField คืนค่า null หมายถึงอะไร', o: ['ช่องนี้ว่าง', 'ข้อมูลในช่องนี้ผ่าน', 'ข้อมูลผิด', 'ให้ข้ามการตรวจ'], a: 1, x: 'คืน null = ผ่าน คืน String = ไม่ผ่าน และข้อความนั้นแสดงใต้ช่อง validate() จะได้ true ก็ต่อเมื่อทุกช่องคืน null' },
    { q: 'TextEditingController ที่สร้างในหน้าฟอร์มต้องทำอะไรใน dispose()', o: ['ไม่ต้องทำอะไร', 'เรียก .clear()', 'เรียก .dispose() ทุกตัว ก่อน super.dispose()', 'ตั้งค่าเป็น null'], a: 2, x: 'controller จองทรัพยากรไว้ ต้องคืนตอนหน้าจอถูกทำลาย ไม่งั้นหน่วยความจำรั่ว' },
    { q: 'ใน _save() หลัง await provider.addBook(book) ทำไมต้องเช็ก if (!mounted) return; ก่อน Navigator.pop(context)', o: ['เพื่อให้บันทึกเร็วขึ้น', 'ระหว่างรอ หน้าจออาจถูกปิดไปแล้ว ใช้ context ของหน้าที่ไม่อยู่แล้วจะพัง', 'เพราะ Navigator ต้องการค่า mounted', 'เพื่อเรียก notifyListeners'], a: 1, x: 'หลัง await ทุกครั้งที่จะใช้ context หรือ setState ให้เช็ก mounted ก่อน (บท 12 หัวข้อ 12.2)' },
    { q: 'db.insert(\'books\', map) คืนค่าอะไร', o: ['จำนวนแถวที่เพิ่ม', 'id ของแถวที่เพิ่งสร้าง', 'Map ของแถวใหม่', 'true หรือ false'], a: 1, x: 'insert คืน id ใหม่ ส่วน update และ delete คืนจำนวนแถวที่ได้รับผลกระทบ query คืน List<Map<String, dynamic>>' },
    { q: 'ทำไม DatabaseHelper ใช้รูปแบบ Singleton', o: ['เพื่อให้มีหลายฐานข้อมูล', 'ให้ทั้งแอปใช้ connection เดียว เปิดไฟล์ครั้งเดียว และมีที่เดียวที่ดูแล onCreate / onUpgrade', 'เพราะ sqflite บังคับ', 'เพื่อให้ใช้ setState ได้'], a: 1, x: 'constructor เป็น private คนนอกต้องใช้ DatabaseHelper.instance ตัวเดียวกันหมด และ SQLite ยอมให้เขียนได้ทีละราย การรวมไว้ที่เดียวทำให้คำสั่งเข้าคิวกันเอง' },
    { q: 'หน้าฟอร์มควรเป็น widget แบบไหน', o: ['StatelessWidget เพราะไม่มีข้อมูล', 'StatefulWidget เพราะต้องเก็บ controller, ค่าสวิตช์ และสั่ง setState', 'ChangeNotifier', 'Consumer'], a: 1, x: 'ฟอร์มมีค่าที่เปลี่ยนระหว่างผู้ใช้กรอก และต้องมี initState / dispose ซึ่งมีเฉพาะใน State' },
    { q: 'id: widget.book?.id ในหน้าฟอร์มให้ค่าอะไร', o: ['error ถ้า book เป็น null', 'null ตอนเพิ่มใหม่ และ id เดิมตอนแก้ไข', 'id ใหม่จากฐานข้อมูล', '0 เสมอ'], a: 1, x: '?. คือถ้าด้านซ้ายเป็น null ผลก็เป็น null ไม่พัง' },
    { q: 'ใน fetchBooks() บรรทัดไหนทำให้ Map แต่ละแถวกลายเป็นออบเจกต์ Book', o: ['notifyListeners()', 'rows.map((row) => Book.fromMap(row)).toList()', 'await _initDatabase()', 'orderBy: \'id DESC\''], a: 1, x: 'query ได้ List<Map> มา .map(fromMap) แปลงทีละแถว .toList() ทำให้กลับเป็น List<Book>' },
    { q: 'รันแอปบน Chrome หรือ Windows แล้วเจอ MissingPluginException ตอนเปิดฐานข้อมูล ควรทำอย่างไร', o: ['ลบ pubspec.lock', 'sqflite ทำงานบน Android / iOS ให้รันบน emulator หรือมือถือ และหยุดแอปแล้วรันใหม่ทั้งหมดหลังเพิ่มแพ็กเกจ', 'เปลี่ยนเป็น shared_preferences', 'ใส่ async ให้ main'], a: 1, x: 'plugin ที่ใช้โค้ด native ต้องรันบนแพลตฟอร์มที่รองรับ และ hot reload ไม่โหลด plugin ใหม่' },
  ];

  const FILL_TOKENS = ['ChangeNotifierProvider', 'ChangeNotifier', 'notifyListeners', 'Consumer', 'context.read', 'openDatabase', 'onCreate', 'getDatabasesPath', 'join', 'CREATE TABLE', 'PRIMARY KEY', 'AUTOINCREMENT', 'INTEGER', 'TEXT', 'REAL', 'insert', 'query', 'update', 'delete', 'whereArgs', 'where', "'id = ?'", 'orderBy', 'toMap', 'fromMap', 'factory', 'required', 'toIso8601String', 'DateTime.parse', 'toDouble', 'as num', '== 1', '? 1 : 0', 'if (id != null)', 'GlobalKey<FormState>', 'TextEditingController', 'validate', 'validator', 'dispose', 'initState', 'setState', 'mounted', 'Navigator.push', 'Navigator.pop', 'MaterialPageRoute', 'ListView.builder', 'itemCount', 'itemBuilder', 'StatefulWidget', 'StatelessWidget', 'createState', 'async', 'await', 'int?', 'DatabaseHelper.instance', '_privateConstructor', 'double.parse', 'int.parse', 'tryParse', 'showDatePicker', 'SwitchListTile', 'TextFormField', 'runApp'];
  const wordy = ch => /[A-Za-z0-9_]/.test(ch);

  function practiceShell() {
    return `<main class="wrap">
      <div class="subtabs" id="ptabs">
        <button data-p="fill" aria-pressed="true">เติมโค้ด</button>
        <button data-p="quiz" aria-pressed="false">ควิซ</button>
        <button data-p="mock" aria-pressed="false">โจทย์จำลอง</button>
      </div>
      <div class="lesson" id="p-fill"></div>
      <div class="lesson" id="p-quiz" hidden></div>
      <div class="lesson" id="p-mock" hidden></div>
    </main>`;
  }

  const fill = { ent: null, file: null, a: null, blanks: [] };
  function newFill() {
    const ents = Gen.ENTITIES;
    fill.ent = ents[Math.floor(Math.random() * ents.length)];
    const { files } = Gen.build(fill.ent, state.mode);
    fill.file = files[Math.floor(Math.random() * files.length)];
    fill.a = analyze(fill.file.code);
    const text = fill.a.text, cands = [];
    FILL_TOKENS.forEach(tok => {
      let i = text.indexOf(tok);
      while (i >= 0) {
        const b = text[i - 1], e = text[i + tok.length];
        const okB = !wordy(tok[0]) || !b || !wordy(b);
        const okE = !wordy(tok[tok.length - 1]) || !e || !wordy(e);
        if (okB && okE && fill.a.cls[i] !== 'c') cands.push([i, i + tok.length, tok]);
        i = text.indexOf(tok, i + 1);
      }
    });
    cands.sort(() => Math.random() - .5);
    const chosen = [];
    for (const c of cands) {
      if (chosen.length >= 7) break;
      if (chosen.some(x => !(c[1] <= x[0] - 2 || c[0] >= x[1] + 2))) continue;
      if (chosen.some(x => x[2] === c[2])) continue;
      chosen.push(c);
    }
    fill.blanks = chosen.sort((x, y) => x[0] - y[0]);
    drawFill();
  }
  function drawFill() {
    let html = '', pos = 0;
    fill.blanks.forEach(([s, e, tok], k) => {
      html += emit(fill.a, pos, s) + `<input class="blank" data-k="${k}" autocomplete="off" autocapitalize="off" spellcheck="false" style="width:${Math.max(tok.length, 3) + 1.5}ch" aria-label="ช่องที่ ${k + 1}">`;
      pos = e;
    });
    html += emit(fill.a, pos);
    const n = Gen.names(fill.ent);
    $('#p-fill').innerHTML = `<div class="card">
      <h2>เติมโค้ดที่หายไป</h2>
      <p class="lede">สุ่ม entity กับไฟล์ให้ทุกรอบ พิมพ์คำที่หายไปให้ตรงตัวอักษร (ตัวพิมพ์เล็กใหญ่มีผล) ฝึกจนพิมพ์ได้โดยไม่ต้องเปิดดู</p>
      <div class="filehead"><span class="path">${esc(fill.file.path)}</span><span class="tag">${esc(n.C)} (${esc(n.th)})</span></div>
      <pre class="code"><code>${html}</code></pre>
      <div class="fillbar">
        <button class="btn btn-acc" id="f-check">ตรวจคำตอบ</button>
        <button class="btn btn-soft" id="f-show">ดูเฉลย</button>
        <button class="btn btn-soft" id="f-new"><i class="ph ph-shuffle"></i>สุ่มใหม่</button>
        <span class="score" id="f-score"></span>
      </div>
    </div>`;
    const inputs = $$('#p-fill .blank');
    inputs.forEach((inp, k) => inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); (inputs[k + 1] || $('#f-check')).focus(); } }));
    $('#f-check').onclick = () => {
      let ok = 0;
      inputs.forEach((inp, k) => { const good = inp.value.trim() === fill.blanks[k][2]; inp.classList.toggle('ok', good); inp.classList.toggle('no', !good); ok += good; });
      $('#f-score').textContent = `ถูก ${ok} จาก ${inputs.length}`;
    };
    $('#f-show').onclick = () => { inputs.forEach((inp, k) => { inp.value = fill.blanks[k][2]; inp.classList.remove('no'); inp.classList.add('ok'); }); $('#f-score').textContent = ''; };
    $('#f-new').onclick = newFill;
  }

  const quiz = { order: [], i: 0, score: 0, answered: false };
  function newQuiz() {
    quiz.order = QUIZ.map((_, i) => i).sort(() => Math.random() - .5);
    quiz.i = 0; quiz.score = 0; drawQuiz();
  }
  function drawQuiz() {
    const box = $('#p-quiz');
    if (quiz.i >= quiz.order.length) {
      box.innerHTML = `<div class="card q"><h2>ได้ ${quiz.score} จาก ${quiz.order.length}</h2><p class="lede">${quiz.score >= quiz.order.length - 3 ? 'พร้อมแล้ว ไปลองโจทย์จำลองแบบจับเวลาต่อ' : 'ข้อที่ผิด ย้อนไปอ่านในแท็บเรียน แล้วกลับมาทำใหม่ ข้อจะสลับลำดับทุกรอบ'}</p><button class="btn btn-acc" id="q-again"><i class="ph ph-arrow-counter-clockwise"></i>ทำใหม่</button></div>`;
      $('#q-again').onclick = newQuiz; return;
    }
    const Q = QUIZ[quiz.order[quiz.i]]; quiz.answered = false;
    box.innerHTML = `<div class="card q">
      <div class="qmeta"><span>ข้อ ${quiz.i + 1} จาก ${quiz.order.length}</span><span>ถูก ${quiz.score}</span></div>
      <div class="qbar"><div style="width:${quiz.i / quiz.order.length * 100}%"></div></div>
      <p class="qtext">${esc(Q.q)}</p>
      <div class="opts">${Q.o.map((o, k) => `<button class="opt" data-k="${k}"><span class="L">${'ABCD'[k]}</span><span>${esc(o)}</span></button>`).join('')}</div>
      <div id="q-fb"></div>
    </div>`;
    $$('#p-quiz .opt').forEach(b => b.onclick = () => {
      if (quiz.answered) return; quiz.answered = true;
      const k = +b.dataset.k, good = k === Q.a; if (good) quiz.score++;
      $$('#p-quiz .opt').forEach(x => { if (+x.dataset.k === Q.a) x.classList.add('right'); });
      if (!good) b.classList.add('wrong');
      $('#q-fb').innerHTML = `<div class="fb ${good ? 'good' : 'bad'}"><b>${good ? 'ถูกต้อง' : 'ยังไม่ใช่ คำตอบคือ ' + 'ABCD'[Q.a]}</b>${esc(Q.x)}</div>
        <button class="next" id="q-next"><div>${quiz.i + 1 < quiz.order.length ? 'ข้อต่อไป' : 'ดูคะแนน'}</div><i class="ph ph-arrow-right"></i></button>`;
      $('#q-next').onclick = () => { quiz.i++; drawQuiz(); };
      $('#q-next').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  const mock = { ent: null, left: 120 * 60, t: null };
  const MOCK_CHECKS = [
    'สร้าง private repo, push โปรเจกต์ตั้งต้น และเพิ่ม collaborator แล้ว (ทำก่อนเริ่มเขียน)',
    'Model: ฟิลด์ครบ, int? id, constructor แบบ required, toMap (if id != null) และ fromMap แปลงชนิดถูก',
    'CREATE TABLE: ชนิดคอลัมน์ตรงกับ Dart (TEXT, INTEGER, REAL, bool เป็น INTEGER)',
    'Provider: with ChangeNotifier, ลิสต์ + getter, fetch / add / update / delete ครบ และทุกตัวจบด้วย notifyListeners',
    'main.dart: ลงทะเบียน provider (ChangeNotifierProvider หรือ MultiProvider)',
    'หน้ารายการ: Consumer + ListView.builder + ปุ่มลบ + แตะเพื่อแก้ + ปุ่ม +',
    'หน้าฟอร์ม: Form + GlobalKey + TextFormField + validator, เติมค่าเดิมตอนแก้, dispose controller',
    'ทดสอบบนเครื่อง: เพิ่ม แก้ ลบ แล้วปิดแอปเปิดใหม่ ข้อมูลยังอยู่',
    'commit + push รอบสุดท้าย และเปิดหน้า repo ดูว่าไฟล์ขึ้นครบ',
  ];
  function newMock() {
    const pool = Gen.ENTITIES.filter(e => e !== mock.ent);
    mock.ent = pool[Math.floor(Math.random() * pool.length)];
    mock.left = 120 * 60; clearInterval(mock.t); mock.t = null; drawMock();
  }
  function drawMock() {
    const n = Gen.names(mock.ent);
    $('#p-mock').innerHTML = `<div class="card">
      <h2>โจทย์จำลอง: ทำแอป CRUD ของ ${esc(n.C)} (${esc(n.th)})</h2>
      <p class="lede">เปิดโปรเจกต์ Flutter จริงแล้วลองเขียนเองโดยไม่ดูเฉลย เหมือนวันสอบ ใช้ได้แค่เอกสารประกอบการสอน จับเวลา 2 ชั่วโมง</p>
      <div class="spec">${mock.ent.fields.map(([nm, ty, lb]) => `<div><div class="fn">${nm}</div><div class="ft">${ty}</div><div class="fl">${esc(lb)}</div></div>`).join('')}</div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:8px 0 22px">
        <span class="timer" id="m-time"></span>
        <button class="btn btn-acc" id="m-go"></button>
        <button class="btn btn-soft" id="m-new"><i class="ph ph-shuffle"></i>สุ่ม entity ใหม่</button>
        <button class="btn btn-soft" id="m-ans"><i class="ph ph-eye"></i>ดูเฉลย</button>
      </div>
      <ul class="checks">${MOCK_CHECKS.map(c => `<li><label><input type="checkbox"><span>${esc(c)}</span></label></li>`).join('')}</ul>
    </div>`;
    tick();
    $('#m-go').onclick = () => {
      if (mock.t) { clearInterval(mock.t); mock.t = null; }
      else mock.t = setInterval(() => { mock.left = Math.max(0, mock.left - 1); tick(); if (!mock.left) { clearInterval(mock.t); mock.t = null; } }, 1000);
      tick();
    };
    $('#m-new').onclick = newMock;
    $('#m-ans').onclick = () => { state.entKey = mock.ent.cls; store.set('ent', state.entKey); location.hash = '#learn'; setTimeout(() => go('sec-files'), 60); };
  }
  function tick() {
    const m = Math.floor(mock.left / 60), s = mock.left % 60;
    const el = $('#m-time'); if (!el) return;
    el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    $('#m-go').innerHTML = mock.t ? '<i class="ph ph-pause"></i>หยุด' : `<i class="ph ph-play"></i>${mock.left < 7200 ? 'เดินต่อ' : 'เริ่มจับเวลา'}`;
  }

  /* ---------------- exam view ---------------- */
  function examShell() {
    const bash = s => codeHTML(s);
    const errs = [
      ['no such table: books', 'ไฟล์ .db มีอยู่แล้วตั้งแต่รันครั้งก่อน onCreate จึงไม่ถูกเรียก ตารางใหม่เลยไม่เกิด', 'ถอนการติดตั้งแอปจาก emulator (กดค้างที่ไอคอนแล้ว Uninstall) แล้วรันใหม่ หรือเปลี่ยนชื่อไฟล์ .db'],
      ['table books has no column named ...', 'แก้ CREATE TABLE ทีหลัง แต่ตารางเก่าถูกสร้างไปแล้ว หรือชื่อคอลัมน์กับ key ใน toMap ไม่ตรงกัน', 'ตรวจว่า key ใน toMap สะกดตรงกับชื่อคอลัมน์ทุกตัว แล้วถอนการติดตั้งแอปและรันใหม่'],
      ['ProviderNotFoundException', 'ยังไม่ได้ลงทะเบียน provider ตัวนั้นใน main.dart', 'เพิ่ม ChangeNotifierProvider(create: ...) ใน main หรือใน MultiProvider แล้วหยุดแอปและรันใหม่ (hot reload ไม่พอ)'],
      ["type 'int' is not a subtype of type 'double'", 'ใน fromMap เขียน as double แต่ค่าที่เก็บเป็นเลขกลม SQLite ส่งกลับมาเป็น int', "เปลี่ยนเป็น (map['price'] as num).toDouble()"],
      ['datatype mismatch', "toMap ส่ง 'id': null ไปตอน update", "ใน toMap เขียน if (id != null) 'id': id,"],
      ["'Transaction' is imported from both ...", 'ชื่อคลาส model ชนกับคลาสที่มีอยู่แล้ว (Transaction ของ sqflite)', 'เปลี่ยนชื่อคลาส เช่น MyTransaction'],
      ['Null check operator used on a null value', 'ใช้ ! กับค่าที่เป็น null เช่น _formKey.currentState! ทั้งที่ไม่ได้ใส่ key ให้ Form หรือ id! ของออบเจกต์ที่ยังไม่บันทึก', 'ตรวจว่า Form(key: _formKey) และใช้ id! เฉพาะของที่อ่านจากฐานข้อมูล'],
      ['FormatException: Invalid double', 'double.parse เจอข้อความที่ไม่ใช่ตัวเลข เพราะ validator ไม่ได้เช็ก', 'ใน validator ใช้ double.tryParse(value) == null แล้วคืนข้อความ error'],
      ['MissingPluginException (sqflite)', 'รันบน Chrome หรือ Windows ซึ่ง sqflite ไม่รองรับ หรือเพิ่มแพ็กเกจแล้วใช้แค่ hot reload', 'รันบน Android emulator หรือมือถือ และหยุดแอปแล้วกด Run ใหม่ทั้งหมด'],
      ['กดบันทึกแล้วรายการไม่อัปเดต', 'ลืม notifyListeners หรือไม่ได้ fetch ใหม่หลัง insert / update / delete', 'ให้ทุกเมธอดจบด้วย await fetch...() ซึ่งมี notifyListeners() อยู่ท้ายสุด'],
      ["Don't use 'BuildContext's across async gaps", 'ใช้ context หลัง await โดยไม่เช็กว่าหน้ายังอยู่', 'ใส่ if (!mounted) return; ก่อน Navigator.pop(context)'],
    ];
    const docs = [
      ['Model, toMap, fromMap, แปลง bool / DateTime / enum', 'บท 13 หัวข้อ 13.7 และปฏิบัติการบท 13 กระบวนการที่ 2 (MyTransaction)'],
      ['CREATE TABLE, ชนิดข้อมูล, ข้อบังคับ', 'บท 13 หัวข้อ 13.5'],
      ['DatabaseHelper, Singleton, openDatabase', 'บท 13 หัวข้อ 13.4'],
      ['insert / query / update / delete, where + whereArgs', 'บท 13 หัวข้อ 13.6 และปฏิบัติการบท 13 กระบวนการที่ 3 ถึง 6'],
      ['Provider ที่ถือฐานข้อมูลเอง (โค้ดเต็มที่ใกล้ข้อสอบที่สุด)', 'ปฏิบัติการบท 13: แอปบัญชีรายรับ-รายจ่าย'],
      ['ChangeNotifier, ChangeNotifierProvider, read / watch', 'บท 10'],
      ['Consumer, MultiProvider', 'บท 11 หัวข้อ 11.2 และ 11.7'],
      ['Form, GlobalKey, TextFormField, validator, controller, dispose', 'บท 8 หัวข้อ 8.3 ถึง 8.8'],
      ['หน้าฟอร์มแก้ไขที่ใช้ provider + controller', 'ปฏิบัติการที่ 1 บท 11 (EditItemScreen)'],
      ['Navigator.push / pop, ส่งข้อมูลไปหน้าใหม่', 'บท 9 หัวข้อ 9.3 ถึง 9.5'],
      ['async / await, mounted หลัง await', 'บท 2.2 และบท 12 หัวข้อ 12.2'],
    ];
    return `<main class="wrap">
      <div class="lesson card">
        <h2>quiz พุธ 15 ต.ค. 2569, 08:00 ถึง 10:00 ห้อง SC2-307</h2>
        <p class="lede">โจทย์ให้ entity ไม่ซ้ำกันแต่ละคน ต้องออกแบบ model, provider และ UI ให้ทำ CRUD กับ SQLite ได้ ส่งผ่าน GitHub repo แบบ private ใช้ได้เฉพาะเอกสารประกอบการสอน ห้ามใช้ AI</p>
        <h3>แบ่งเวลา 120 นาที</h3>
        <ol class="tl">
          <li><span class="min">0</span><div class="what"><b>เปิดโปรเจกต์ตั้งต้น ทำ repo ให้เสร็จก่อน</b><span>clone, flutter pub get, รันบน emulator ให้ขึ้น แล้วสร้าง private repo, push และเพิ่ม collaborator ทันที จะได้ไม่ลืมตอนท้าย</span></div></li>
          <li><span class="min">15</span><div class="what"><b>อ่านโค้ดเดิม</b><span>ดูว่า main.dart ลงทะเบียน provider อะไร ใช้ DatabaseHelper หรือให้ provider ถือ DB แล้วเขียนตามแบบเดียวกัน</span></div></li>
          <li><span class="min">20</span><div class="what"><b>Model</b><span>ฟิลด์ + toMap + fromMap ตรวจชนิดแต่ละฟิลด์</span></div></li>
          <li><span class="min">35</span><div class="what"><b>Provider + CREATE TABLE</b><span>CRUD ครบ 4 ตัว ใช้ไฟล์ .db ใหม่ของตัวเอง แล้ว commit</span></div></li>
          <li><span class="min">55</span><div class="what"><b>main.dart</b><span>เพิ่ม provider ใน MultiProvider</span></div></li>
          <li><span class="min">60</span><div class="what"><b>หน้ารายการ</b><span>Consumer + ListView.builder + ลบ รันดูว่าขึ้นข้อความว่าง แล้ว commit</span></div></li>
          <li><span class="min">75</span><div class="what"><b>หน้าฟอร์ม</b><span>เพิ่มก่อน ให้เพิ่มได้จริง แล้วค่อยทำโหมดแก้ไข</span></div></li>
          <li><span class="min">100</span><div class="what"><b>ทดสอบครบวงจร</b><span>เพิ่ม แก้ ลบ ปิดแอปแล้วเปิดใหม่ ข้อมูลต้องยังอยู่</span></div></li>
          <li><span class="min">110</span><div class="what"><b>push รอบสุดท้าย</b><span>เปิดหน้า repo บนเว็บ ดูว่าไฟล์ล่าสุดขึ้นจริง เป็น Private และมีชื่ออาจารย์ใน Collaborators</span></div></li>
        </ol>
      </div>

      <div class="lesson card">
        <h2>ส่งงานด้วย GitHub repo แบบ private</h2>
        <p class="lede">ทำตามลำดับนี้ตั้งแต่ต้นชั่วโมง ถ้า push ไม่ผ่านจะได้มีเวลาแก้</p>
        <h3>1. เอาโปรเจกต์ตั้งต้นลงเครื่อง</h3>
        ${bash(`git clone <URL ที่อาจารย์ให้> quiz
cd quiz
flutter pub get`)}
        <h3>2. สร้าง repo ของตัวเองบน github.com</h3>
        <ol class="steps">
          <li>มุมขวาบน กด <b>+</b> แล้วเลือก <b>New repository</b></li>
          <li>ตั้งชื่อ เช่น <code>273387-quiz-รหัสนิสิต</code> และเลือก <b>Private</b></li>
          <li><b>ไม่ต้อง</b>ติ๊ก Add a README (ให้ repo ว่าง) แล้วกด <b>Create repository</b></li>
        </ol>
        <h3>3. ชี้โปรเจกต์ไปที่ repo ใหม่แล้ว push</h3>
        ${bash(`git remote set-url origin https://github.com/<username>/<ชื่อ repo>.git
git branch -M main
git push -u origin main`)}
        <p>ถ้าโหลดมาเป็นไฟล์ zip (ไม่มีโฟลเดอร์ .git) ให้ใช้ชุดนี้แทน</p>
        ${bash(`git init
git add .
git commit -m "starter project"
git branch -M main
git remote add origin https://github.com/<username>/<ชื่อ repo>.git
git push -u origin main`)}
        <p>ถ้า git ถามชื่อและอีเมล ให้ตั้งครั้งเดียว: <code>git config --global user.name "ชื่อ"</code> และ <code>git config --global user.email "อีเมล GitHub"</code> ถ้ามีหน้าต่าง login GitHub เด้ง ให้ login ผ่านเบราว์เซอร์</p>
        <h3>4. เพิ่มอาจารย์เป็น collaborator</h3>
        <ol class="steps">
          <li>ในหน้า repo กด <b>Settings</b> แล้วเลือก <b>Collaborators</b> (เมนูซ้าย หมวด Access)</li>
          <li>กด <b>Add people</b> พิมพ์ <code>nattaponk@nu.ac.th</code> เลือกบัญชีที่ขึ้นมา แล้วกด Add</li>
          <li>สถานะขึ้นว่ารอตอบรับ (Pending) ถือว่าเพิ่มสำเร็จแล้ว</li>
        </ol>
        <h3>5. ทุกครั้งที่ทำเสร็จหนึ่งไฟล์</h3>
        ${bash(`git add .
git commit -m "add book model"
git push`)}
      </div>

      <div class="lesson card">
        <h2>เจอ error นี้ แก้แบบนี้</h2>
        <p class="lede">ข้อความ error ที่เจอบ่อยที่สุดกับงาน SQLite + Provider</p>
        <div class="errs">${errs.map(([m, why, fix]) => `<div class="err"><div class="msg">${esc(m)}</div><div><p>${esc(why)}</p><p><b>แก้:</b> ${esc(fix)}</p></div></div>`).join('')}</div>
      </div>

      <div class="lesson card">
        <h2>ลืมตรงไหน เปิดเอกสารหน้าไหน</h2>
        <p class="lede">เอกสารประกอบการสอนเปิดได้ในห้องสอบ ปฏิบัติการบท 13 มีโค้ดที่ใกล้กับข้อสอบที่สุด</p>
        <div class="tblwrap"><table class="tbl"><tr><th>ต้องการ</th><th>เปิด</th></tr>${docs.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table></div>
      </div>
    </main>`;
  }

  /* ---------------- custom entity dialog ---------------- */
  function openDialog() {
    const base = state.custom || { cls: '', th: '', fields: [['name', 'String', 'ชื่อ'], ['price', 'double', 'ราคา']] };
    const dlg = $('#dlg');
    const row = ([nm, ty, lb]) => `<div class="frow"><input class="inp" data-r="n" placeholder="ชื่อฟิลด์ เช่น price" value="${esc(nm)}"><select data-r="t">${Object.keys(Gen.TYPES).map(t => `<option ${t === ty ? 'selected' : ''}>${t}</option>`).join('')}</select><input class="inp lbl" data-r="l" placeholder="ป้ายภาษาไทย" value="${esc(lb || '')}"><button class="icon-btn" data-rm aria-label="ลบฟิลด์"><i class="ph ph-x"></i></button></div>`;
    dlg.innerHTML = `<form class="dlg" method="dialog">
      <h3>entity ของตัวเอง</h3>
      <p class="lede">พิมพ์ entity ที่อาจารย์ให้ แล้วทั้งหน้าเรียนจะสร้างโค้ดให้ entity นี้ (ไม่ต้องใส่ id ระบบใส่ให้เอง)</p>
      <div class="frow" style="grid-template-columns:1fr 1fr"><input class="inp" id="d-cls" placeholder="ชื่อคลาส เช่น Book" value="${esc(base.cls)}"><input class="inp" id="d-th" placeholder="ชื่อไทย เช่น หนังสือ" value="${esc(base.th)}"></div>
      <div id="d-rows" style="margin-top:12px">${base.fields.map(row).join('')}</div>
      <button type="button" class="btn btn-soft" id="d-add" style="padding:8px 16px"><i class="ph ph-plus"></i>เพิ่มฟิลด์</button>
      <ul class="errlist" id="d-err"></ul>
      <div class="dlgbtns"><button type="button" class="btn btn-soft" id="d-cancel">ยกเลิก</button><button type="button" class="btn btn-acc" id="d-ok">ใช้ entity นี้</button></div>
    </form>`;
    const bindRm = () => $$('[data-rm]', dlg).forEach(b => b.onclick = () => b.closest('.frow').remove());
    bindRm();
    $('#d-add', dlg).onclick = () => { $('#d-rows').insertAdjacentHTML('beforeend', row(['', 'String', ''])); bindRm(); };
    $('#d-cancel', dlg).onclick = () => dlg.close();
    $('#d-ok', dlg).onclick = () => {
      const ent = {
        cls: $('#d-cls').value.trim(), th: $('#d-th').value.trim() || $('#d-cls').value.trim(),
        fields: $$('#d-rows .frow').map(r => [$('[data-r=n]', r).value.trim(), $('[data-r=t]', r).value, $('[data-r=l]', r).value.trim() || $('[data-r=n]', r).value.trim()]).filter(f => f[0]),
      };
      const errs = Gen.check(ent);
      if (errs.length) { $('#d-err').innerHTML = errs.map(e => `<li>${esc(e)}</li>`).join(''); return; }
      state.custom = ent; state.entKey = '__custom';
      store.set('custom', ent); store.set('ent', '__custom');
      dlg.close(); renderEntity(); toast(`สร้างโค้ดให้ ${ent.cls} แล้ว`);
    };
    dlg.showModal();
  }

  /* ---------------- tabs, routing, wiring ---------------- */
  function go(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  let built = {};
  function show(tab) {
    if (!['learn', 'practice', 'exam'].includes(tab)) tab = 'learn';
    state.tab = tab;
    $$('.seg button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
    ['learn', 'practice', 'exam'].forEach(t => { $('#view-' + t).hidden = t !== tab; });
    if (!built[tab]) {
      built[tab] = true;
      if (tab === 'learn') { $('#view-learn').innerHTML = learnShell(); renderPrimer(); renderEntity(); }
      if (tab === 'practice') { $('#view-practice').innerHTML = practiceShell(); newFill(); newQuiz(); newMock(); }
      if (tab === 'exam') $('#view-exam').innerHTML = examShell();
    } else if (tab === 'learn') renderEntity();
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', e => {
    const j = e.target.closest('[data-jump]');
    if (j) {
      const [tab, sub] = j.dataset.jump.split(':');
      if (tab === 'practice' || tab === 'exam') {
        location.hash = '#' + tab;
        if (sub) setTimeout(() => $(`#ptabs [data-p="${sub}"]`)?.click(), 30);
      } else go(tab);
      return;
    }
    const g = e.target.closest('[data-go]');
    if (g) { e.preventDefault(); if (state.tab !== 'learn') location.hash = '#learn'; setTimeout(() => go(g.dataset.go), 30); return; }
    const t = e.target.closest('.seg button');
    if (t) { location.hash = '#' + t.dataset.tab; return; }
    const c = e.target.closest('.chip');
    if (c) {
      if (c.id === 'mk') { openDialog(); return; }
      state.entKey = c.dataset.ent; store.set('ent', state.entKey); renderEntity(); return;
    }
    const m = e.target.closest('#mode button');
    if (m) { state.mode = m.dataset.mode; store.set('mode', state.mode); renderEntity(); return; }
    const p = e.target.closest('#ptabs button');
    if (p) {
      $$('#ptabs button').forEach(b => b.setAttribute('aria-pressed', b === p));
      ['fill', 'quiz', 'mock'].forEach(k => { $('#p-' + k).hidden = k !== p.dataset.p; });
    }
  });
  window.addEventListener('hashchange', () => show(location.hash.slice(1)));

  const theme = store.get('theme', null);
  if (theme) document.documentElement.dataset.theme = theme;
  const isDark = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const setIcon = () => { $('#theme').innerHTML = `<i class="ph ${isDark() ? 'ph-sun' : 'ph-moon'}"></i>`; };
  $('#theme').onclick = () => { const t = isDark() ? 'light' : 'dark'; document.documentElement.dataset.theme = t; store.set('theme', t); setIcon(); };
  setIcon();

  show(location.hash.slice(1) || 'learn');
})();
