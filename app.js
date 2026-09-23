/* ============================================================
   SIMULA — CBT Uji Kompetensi Teknologi Bank Darah
   ============================================================ */
(function () {
  'use strict';

  var BANK = window.BANK_SOAL || [];
  var LS_SESSION = 'simula.session.v1';
  var LS_THEME   = 'simula.theme.v1';
  var LS_CONFIG  = 'simula.config.v1';
  var KEYS = ['A', 'B', 'C', 'D', 'E'];
  var KKM = 70; // nilai batas kelulusan

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- state ---------- */
  var cfg = {
    packet: 'paket1', mode: 'ujian', count: 100,
    minutes: 120, shuffleQ: true, shuffleO: true
  };
  var S = null;            // sesi aktif
  var tick = null;         // interval timer
  var reviewing = false;   // mode bahas jawaban

  /* ============================================================
     UTIL
     ============================================================ */
  function store(k, v) {
    try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) { /* storage dimatikan — abaikan */ }
  }
  function load(k) {
    try { var raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pack(id) {
    for (var i = 0; i < BANK.length; i++) if (BANK[i].id === id) return BANK[i];
    return BANK[0];
  }
  function clock(sec) {
    if (sec < 0) sec = 0;
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var mm = (h ? String(m).padStart(2, '0') : String(m));
    return (h ? h + ':' + String(m).padStart(2, '0') : mm) + ':' + String(s).padStart(2, '0');
  }
  function durasi(sec) {
    var m = Math.floor(sec / 60), h = Math.floor(m / 60);
    if (h) return h + ' jam ' + (m % 60) + ' menit';
    return m + ' menit ' + (sec % 60) + ' detik';
  }
  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg; t.hidden = false;
    requestAnimationFrame(function () { t.classList.add('is-on'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('is-on');
      setTimeout(function () { t.hidden = true; }, 320);
    }, 2200);
  }
  function view(name) {
    $$('.view').forEach(function (v) { v.classList.remove('is-active'); });
    $('#view-' + name).classList.add('is-active');
    window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  }
  function confirmDialog(title, body, okLabel, onOk) {
    var m = $('#confirmModal');
    $('#cfTitle').textContent = title;
    $('#cfBody').textContent = body;
    $('#cfOk').textContent = okLabel;
    m.hidden = false;
    function close() { m.hidden = true; $('#cfOk').onclick = null; $('#cfCancel').onclick = null; }
    $('#cfOk').onclick = function () { close(); onOk(); };
    $('#cfCancel').onclick = close;
  }

  /* ============================================================
     TEMA
     ============================================================ */
  (function initTheme() {
    var saved = load(LS_THEME);
    var pref = saved || (window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', pref);
  })();
  $('#themeToggle').addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    store(LS_THEME, next);
  });

  /* ============================================================
     HOME — kartu paket & konfigurasi
     ============================================================ */
  function renderPacks() {
    $('#packGrid').innerHTML = BANK.map(function (p) {
      return '<button class="pack' + (p.id === cfg.packet ? ' is-on' : '') + '" data-pack="' + p.id + '" type="button">' +
        '<div class="pack-top"><span class="pack-name">' + p.nama + '</span>' +
        '<span class="pack-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg></span></div>' +
        '<p class="pack-desc">' + p.deskripsi + '</p>' +
        '<div class="pack-meta"><span class="tag tag-hl">' + p.jumlah + ' soal</span>' +
        (p.kunci === 'analisis'
          ? '<span class="tag tag-warn">kunci belum terverifikasi</span>'
          : '<span class="tag">' + p.judul + '</span>') +
        '</div></button>';
    }).join('');
    $$('.pack').forEach(function (el) {
      el.addEventListener('click', function () {
        cfg.packet = el.dataset.pack;
        renderPacks(); syncConfig();
      });
    });
  }

  function effectiveCount() {
    var total = pack(cfg.packet).jumlah;
    return cfg.count === 'all' ? total : Math.min(cfg.count, total);
  }

  function syncConfig() {
    var p = pack(cfg.packet);
    // jumlah soal terpilih melebihi isi paket -> turunkan ke opsi valid terbesar
    if (cfg.count !== 'all' && cfg.count > p.jumlah) {
      var opsi = [20, 50, 100].filter(function (v) { return v <= p.jumlah; });
      cfg.count = opsi.length ? opsi[opsi.length - 1] : 'all';
    }
    var n = effectiveCount();
    $$('.seg-item[data-mode]').forEach(function (b) {
      var on = b.dataset.mode === cfg.mode;
      b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on);
    });
    $$('.seg-item[data-count]').forEach(function (b) {
      var v = b.dataset.count === 'all' ? 'all' : Number(b.dataset.count);
      var on = v === cfg.count;
      b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on);
      b.disabled = (v !== 'all' && v > p.jumlah);
      b.style.opacity = b.disabled ? .35 : '';
    });
    $('#durVal').textContent = cfg.minutes;
    $('#optShuffleQ').checked = cfg.shuffleQ;
    $('#optShuffleO').checked = cfg.shuffleO;
    $('#jumlahHint').textContent = cfg.count === 'all'
      ? 'Seluruh ' + p.jumlah + ' soal pada paket ini'
      : 'Diambil acak dari ' + p.jumlah + ' soal tersedia';

    $('#launchSummary').innerHTML =
      '<b>' + p.nama + '</b> · ' + p.judul + '<br>' +
      '<b>' + n + '</b> soal · <b>' + cfg.minutes + '</b> menit · mode <b>' +
      (cfg.mode === 'ujian' ? 'Ujian' : 'Latihan') + '</b>' +
      (cfg.mode === 'latihan' ? ' <span style="opacity:.75">(kunci langsung tampil)</span>' : '');

    var note = $('#unverifiedNote');
    if (p.kunci === 'analisis') {
      note.hidden = false;
      note.querySelector('p').innerHTML =
        '<b>' + p.nama + '</b> berasal dari arsip soal yang tidak menyertakan kunci jawaban. ' +
        'Kunci pada paket ini disusun lewat penalaran, <b>bukan kunci resmi</b>, dan sebagian masih bisa diperdebatkan. ' +
        'Cocokkan dengan buku atau dosen Anda sebelum dijadikan patokan.';
    } else { note.hidden = true; }

    store(LS_CONFIG, cfg);
  }

  $$('.seg-item[data-mode]').forEach(function (b) {
    b.addEventListener('click', function () { cfg.mode = b.dataset.mode; syncConfig(); });
  });
  $$('.seg-item[data-count]').forEach(function (b) {
    b.addEventListener('click', function () {
      cfg.count = b.dataset.count === 'all' ? 'all' : Number(b.dataset.count);
      syncConfig();
    });
  });
  $('#durMinus').addEventListener('click', function () {
    cfg.minutes = Math.max(5, cfg.minutes - 10); syncConfig();
  });
  $('#durPlus').addEventListener('click', function () {
    cfg.minutes = Math.min(300, cfg.minutes + 10); syncConfig();
  });
  $('#optShuffleQ').addEventListener('change', function (e) { cfg.shuffleQ = e.target.checked; syncConfig(); });
  $('#optShuffleO').addEventListener('change', function (e) { cfg.shuffleO = e.target.checked; syncConfig(); });

  /* ============================================================
     SESI
     ============================================================ */
  function buildSession() {
    var p = pack(cfg.packet);
    var idx = p.soal.map(function (_, i) { return i; });
    if (cfg.shuffleQ) idx = shuffled(idx);
    idx = idx.slice(0, effectiveCount());

    var items = idx.map(function (i) {
      var src = p.soal[i];
      var order = src.o.map(function (_, k) { return k; });
      if (cfg.shuffleO) order = shuffled(order);
      return {
        src: i,
        q: src.q,
        o: order.map(function (k) { return src.o[k]; }),
        a: order.indexOf(src.a),
        c: src.c || null,
        p: src.p || null,
        pick: null,
        flag: false
      };
    });

    return {
      packet: p.id, packetName: p.nama, packetTitle: p.judul, kunci: p.kunci || 'resmi',
      mode: cfg.mode, items: items, cur: 0,
      total: items.length,
      limit: cfg.minutes * 60,
      left: cfg.minutes * 60,
      startedAt: Date.now(),
      done: false
    };
  }

  function saveSession() { if (S && !S.done) store(LS_SESSION, S); }
  function clearSession() { store(LS_SESSION, null); }

  function startSession(session) {
    S = session;
    reviewing = false;
    $('#examTitle').textContent = S.packetName + ' · ' + S.packetTitle;
    $('#finishLabel').textContent = 'Selesai';
    view('exam');
    renderQuestion();
    startTimer();
    saveSession();
  }

  $('#startBtn').addEventListener('click', function () { startSession(buildSession()); });

  /* ---------- resume ---------- */
  function checkResume() {
    var s = load(LS_SESSION);
    if (!s || !s.items || s.done || s.left <= 0) { $('#resumeBanner').hidden = true; return; }
    var answered = s.items.filter(function (it) { return it.pick !== null; }).length;
    $('#resumeInfo').textContent = s.packetName + ' · ' + answered + '/' + s.total +
      ' terjawab · sisa waktu ' + clock(s.left);
    $('#resumeBanner').hidden = false;
    $('#resumeGo').onclick = function () { startSession(s); };
    $('#resumeDiscard').onclick = function () {
      clearSession(); $('#resumeBanner').hidden = true; toast('Sesi tersimpan dihapus.');
    };
  }

  /* ============================================================
     TIMER
     ============================================================ */
  function startTimer() {
    stopTimer();
    paintTimer();
    tick = setInterval(function () {
      S.left--;
      paintTimer();
      if (S.left % 10 === 0) saveSession();
      if (S.left <= 0) { stopTimer(); finish(true); }
    }, 1000);
  }
  function stopTimer() { if (tick) { clearInterval(tick); tick = null; } }
  function paintTimer() {
    var box = $('#timerBox');
    $('#timerText').textContent = clock(S.left);
    box.classList.toggle('is-warn', S.left <= 300 && S.left > 60);
    box.classList.toggle('is-danger', S.left <= 60);
  }

  /* ============================================================
     RENDER SOAL
     ============================================================ */
  function renderQuestion() {
    var it = S.items[S.cur];
    var showKey = reviewing || S.mode === 'latihan';
    var answered = it.pick !== null;

    $('#examSub').textContent = 'Soal ' + (S.cur + 1) + ' dari ' + S.total;
    $('#qBadge').textContent = 'Soal ' + (S.cur + 1);
    $('#qText').textContent = it.q;
    $('#progressFill').style.width = ((S.cur + 1) / S.total * 100) + '%';

    // badge benar/salah
    var res = $('#qResult');
    if (showKey && answered) {
      var ok = it.pick === it.a;
      res.hidden = false;
      res.className = 'pill pill-result ' + (ok ? 'pill-ok' : 'pill-bad');
      res.textContent = ok ? 'Benar' : 'Salah';
    } else { res.hidden = true; }

    // tombol ragu-ragu
    var fb = $('#flagBtn');
    fb.classList.toggle('is-on', !!it.flag);
    fb.hidden = reviewing;

    // opsi
    var lock = reviewing || (S.mode === 'latihan' && answered);
    $('#optList').innerHTML = it.o.map(function (text, i) {
      var cls = ['opt'];
      if (lock) cls.push('is-locked');
      if (showKey && answered) {
        if (i === it.a) cls.push('is-correct');
        else if (i === it.pick) cls.push('is-wrong');
        else cls.push('is-dim');
      } else if (i === it.pick) {
        cls.push('is-picked');
      }
      var mark = (showKey && answered && i === it.a)
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>'
        : (showKey && answered && i === it.pick)
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>'
          : KEYS[i];
      return '<button class="' + cls.join(' ') + '" data-i="' + i + '" type="button" role="radio" ' +
        'aria-checked="' + (i === it.pick) + '"' + (lock ? ' tabindex="-1"' : '') + '>' +
        '<span class="opt-key">' + mark + '</span>' +
        '<span class="opt-text">' + escapeHtml(text) + '</span></button>';
    }).join('');

    if (!lock) {
      $$('.opt', $('#optList')).forEach(function (el) {
        el.addEventListener('click', function () { choose(Number(el.dataset.i)); });
      });
    }

    // pembahasan
    var ex = $('#explainBox');
    if (showKey && answered) {
      var benar = it.pick === it.a;
      ex.hidden = false;
      ex.classList.toggle('is-ok', benar);
      $('#explainText').innerHTML =
        '<span class="ex-row ex-key"><em>Kunci</em><span><b>' + KEYS[it.a] + '. ' + escapeHtml(it.o[it.a]) + '</b>' +
          (it.c ? ' <span class="ex-conf c-' + it.c + '">keyakinan ' + it.c + '</span>' : '') + '</span></span>' +
        (benar
          ? '<span class="ex-note">Jawaban Anda sudah tepat.</span>'
          : '<span class="ex-row ex-mine"><em>Jawaban Anda</em><b>' + KEYS[it.pick] + '. ' + escapeHtml(it.o[it.pick]) + '</b></span>') +
        (it.p
          ? '<span class="ex-why"><em>Mengapa</em><span>' + escapeHtml(it.p) +
            '<i class="ex-src">Penalaran ini disusun sendiri, bukan kutipan kunci resmi.</i></span></span>'
          : '');
    } else { ex.hidden = true; }

    $('#prevBtn').disabled = S.cur === 0;
    $('#nextBtn').disabled = S.cur === S.total - 1;
    $('#nextBtn').innerHTML = (S.cur === S.total - 1)
      ? 'Soal Terakhir'
      : 'Selanjutnya <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

    $('#mapDot').classList.toggle('is-on', S.items.some(function (x) { return x.flag; }));
    if ($('#drawer').classList.contains('is-on')) renderMap();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  function choose(i) {
    var it = S.items[S.cur];
    if (reviewing) return;
    if (S.mode === 'latihan' && it.pick !== null) return;
    it.pick = i;
    saveSession();
    renderQuestion();
    if (S.mode === 'ujian' && S.cur < S.total - 1) {
      setTimeout(function () { go(S.cur + 1); }, 190);
    }
  }

  function go(i) {
    if (i < 0 || i >= S.total) return;
    S.cur = i;
    saveSession();
    renderQuestion();
  }

  $('#prevBtn').addEventListener('click', function () { go(S.cur - 1); });
  $('#nextBtn').addEventListener('click', function () { go(S.cur + 1); });
  $('#flagBtn').addEventListener('click', function () {
    var it = S.items[S.cur];
    it.flag = !it.flag;
    saveSession();
    renderQuestion();
    toast(it.flag ? 'Soal ditandai ragu-ragu.' : 'Tanda ragu-ragu dihapus.');
  });

  /* ============================================================
     PETA SOAL
     ============================================================ */
  function openMap() { $('#drawer').classList.add('is-on'); $('#scrim').classList.add('is-on'); renderMap(); }
  function closeMap() { $('#drawer').classList.remove('is-on'); $('#scrim').classList.remove('is-on'); }
  $('#mapToggle').addEventListener('click', openMap);
  $('#mapClose').addEventListener('click', closeMap);
  $('#scrim').addEventListener('click', closeMap);

  function renderMap() {
    var showKey = reviewing;
    var answered = S.items.filter(function (x) { return x.pick !== null; }).length;
    var flagged = S.items.filter(function (x) { return x.flag; }).length;

    $('#drStats').innerHTML = showKey
      ? '<div class="dstat"><b style="color:var(--ok)">' + S.items.filter(function (x) { return x.pick === x.a; }).length + '</b><span>Benar</span></div>' +
        '<div class="dstat"><b style="color:var(--bad)">' + S.items.filter(function (x) { return x.pick !== null && x.pick !== x.a; }).length + '</b><span>Salah</span></div>' +
        '<div class="dstat"><b>' + (S.total - answered) + '</b><span>Kosong</span></div>'
      : '<div class="dstat"><b>' + answered + '</b><span>Terjawab</span></div>' +
        '<div class="dstat"><b style="color:var(--warn)">' + flagged + '</b><span>Ragu</span></div>' +
        '<div class="dstat"><b>' + (S.total - answered) + '</b><span>Kosong</span></div>';

    $('#drLegend').innerHTML = showKey
      ? '<span class="lg lg-ok"><i></i>Benar</span><span class="lg lg-bad"><i></i>Salah</span><span class="lg lg-empty"><i></i>Kosong</span>'
      : '<span class="lg lg-done"><i></i>Terjawab</span><span class="lg lg-flag"><i></i>Ragu-ragu</span><span class="lg lg-empty"><i></i>Belum diisi</span>';

    $('#mapGrid').innerHTML = S.items.map(function (it, i) {
      var cls = ['mcell'];
      if (showKey) {
        if (it.pick === null) { /* kosong */ }
        else if (it.pick === it.a) cls.push('is-ok');
        else cls.push('is-bad');
      } else if (it.pick !== null) cls.push('is-done');
      if (it.flag) cls.push('is-flag');
      if (i === S.cur) cls.push('is-now');
      return '<button class="' + cls.join(' ') + '" data-go="' + i + '" type="button">' + (i + 1) + '</button>';
    }).join('');

    $$('.mcell', $('#mapGrid')).forEach(function (el) {
      el.addEventListener('click', function () { go(Number(el.dataset.go)); closeMap(); });
    });
  }

  /* ============================================================
     SELESAI & HASIL
     ============================================================ */
  $('#finishBtn').addEventListener('click', function () {
    if (reviewing) { showResult(); return; }
    var blank = S.items.filter(function (x) { return x.pick === null; }).length;
    confirmDialog(
      'Selesaikan ujian?',
      blank
        ? 'Masih ada ' + blank + ' soal yang belum dijawab. Soal kosong dihitung salah.'
        : 'Seluruh ' + S.total + ' soal sudah terjawab. Jawaban tidak dapat diubah setelah ini.',
      'Ya, Selesaikan',
      function () { finish(false); }
    );
  });

  $('#backHome').addEventListener('click', function () {
    if (reviewing) { view('result'); return; }
    confirmDialog('Keluar dari ujian?',
      'Progres tersimpan otomatis dan dapat dilanjutkan dari beranda.',
      'Ya, Keluar',
      function () {
        stopTimer(); saveSession();
        S = null;                       // lepas sesi dari memori: beranda tidak lagi memicu prompt keluar
        checkResume(); view('home');
      });
  });

  function finish(byTimeout) {
    stopTimer();
    S.done = true;
    S.usedSec = S.limit - Math.max(0, S.left);
    clearSession();
    showResult();
    if (byTimeout) toast('Waktu habis — ujian diselesaikan otomatis.');
  }

  function showResult() {
    reviewing = false;
    closeMap();
    var right = S.items.filter(function (x) { return x.pick === x.a; }).length;
    var wrong = S.items.filter(function (x) { return x.pick !== null && x.pick !== x.a; }).length;
    var blank = S.total - right - wrong;
    var score = Math.round(right / S.total * 1000) / 10;
    var lulus = score >= KKM;

    $('#resPacket').innerHTML = '<i class="dot" style="background:' +
      (lulus ? 'var(--ok)' : 'var(--bad)') + ';box-shadow:none"></i>' +
      S.packetName + ' · ' + S.packetTitle;

    $('#resVerdict').textContent = lulus ? 'Selamat, Anda Lulus!' : 'Belum Mencapai Batas Lulus';
    $('#resMessage').textContent = lulus
      ? 'Nilai Anda di atas batas kelulusan ' + KKM + '. Pertahankan dan coba paket lain untuk memperluas cakupan materi.'
      : 'Batas kelulusan adalah ' + KKM + '. Pelajari kembali soal yang salah pada rincian di bawah, lalu ulangi ujian.';

    var num = $('#scoreNum'), target = score, t0 = null;
    function animate(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / 1100);
      num.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(1);
      if (p < 1) requestAnimationFrame(animate);
      else num.textContent = target.toFixed(1);
    }
    num.textContent = '0';
    requestAnimationFrame(animate);
    // rAF bisa dihentikan browser saat tab tidak aktif — pastikan nilai akhir tetap tampil
    setTimeout(function () { num.textContent = target.toFixed(1); }, 1250);

    var C = 2 * Math.PI * 86;
    var ring = $('#ringFg');
    ring.style.strokeDasharray = C;
    ring.style.strokeDashoffset = C;
    ring.style.stroke = lulus ? 'var(--ok)' : 'var(--bad)';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { ring.style.strokeDashoffset = C * (1 - score / 100); });
    });

    $('#resStats').innerHTML =
      '<div class="rstat ok"><b>' + right + '</b><span>Benar</span></div>' +
      '<div class="rstat bad"><b>' + wrong + '</b><span>Salah</span></div>' +
      '<div class="rstat warn"><b>' + blank + '</b><span>Kosong</span></div>' +
      '<div class="rstat"><b style="font-size:17px">' + durasi(S.usedSec || 0) + '</b><span>Waktu Pakai</span></div>';

    renderBreakdown('all');
    view('result');
  }

  var bdFilter = 'all';
  function renderBreakdown(f) {
    bdFilter = f;
    $$('.chip', $('#bdFilter')).forEach(function (c) { c.classList.toggle('is-on', c.dataset.f === f); });

    var rows = S.items.map(function (it, i) { return { it: it, i: i }; }).filter(function (r) {
      if (f === 'right') return r.it.pick === r.it.a;
      if (f === 'wrong') return r.it.pick !== null && r.it.pick !== r.it.a;
      if (f === 'blank') return r.it.pick === null;
      return true;
    });

    if (!rows.length) {
      $('#bdList').innerHTML = '<div class="bd-empty">Tidak ada soal pada kategori ini. 🎉</div>';
      return;
    }

    $('#bdList').innerHTML = rows.map(function (r) {
      var k = r.it.pick === null ? 'blank' : (r.it.pick === r.it.a ? 'ok' : 'bad');
      return '<button class="bd-item" data-go="' + r.i + '" type="button">' +
        '<span class="bd-no ' + k + '">' + (r.i + 1) + '</span>' +
        '<span class="bd-q">' + escapeHtml(r.it.q) + '</span>' +
        '<span class="bd-go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span>' +
        '</button>';
    }).join('');

    $$('.bd-item', $('#bdList')).forEach(function (el) {
      el.addEventListener('click', function () { enterReview(Number(el.dataset.go)); });
    });
  }
  $$('.chip', $('#bdFilter')).forEach(function (c) {
    c.addEventListener('click', function () { renderBreakdown(c.dataset.f); });
  });

  /* ---------- review ---------- */
  function enterReview(at) {
    reviewing = true;
    stopTimer();
    S.cur = at || 0;
    $('#finishLabel').textContent = 'Hasil';
    $('#timerBox').style.display = 'none';
    view('exam');
    renderQuestion();
  }
  $('#reviewBtn').addEventListener('click', function () { enterReview(0); });
  $('#retryBtn').addEventListener('click', function () {
    $('#timerBox').style.display = '';
    cfg.packet = S.packet;
    startSession(buildSession());
  });
  $('#homeBtn').addEventListener('click', function () {
    $('#timerBox').style.display = '';
    reviewing = false;
    S = null;
    checkResume(); renderPacks(); syncConfig(); view('home');
  });

  /* ============================================================
     KEYBOARD
     ============================================================ */
  document.addEventListener('keydown', function (e) {
    if (!$('#view-exam').classList.contains('is-active')) return;
    if (!$('#confirmModal').hidden) {
      if (e.key === 'Escape') $('#cfCancel').click();
      return;
    }
    if (e.key === 'Escape') { closeMap(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    var k = e.key.toUpperCase();
    var oi = KEYS.indexOf(k);
    if (oi > -1 && oi < S.items[S.cur].o.length) { e.preventDefault(); choose(oi); return; }
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(S.cur + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(S.cur - 1); }
    else if (k === 'F' && !reviewing) { e.preventDefault(); $('#flagBtn').click(); }
    else if (k === 'M') { e.preventDefault(); $('#drawer').classList.contains('is-on') ? closeMap() : openMap(); }
  });

  window.addEventListener('beforeunload', function (e) {
    if (S && !S.done && !reviewing) { saveSession(); e.preventDefault(); e.returnValue = ''; }
  });

  /* ============================================================
     INIT
     ============================================================ */
  (function init() {
    if (!BANK.length) {
      document.body.innerHTML = '<div style="padding:60px;text-align:center;font-family:sans-serif">' +
        '<h1>Bank soal tidak termuat</h1><p>Pastikan berkas <code>data/soal.js</code> ada di samping halaman ini.</p></div>';
      return;
    }
    var saved = load(LS_CONFIG);
    if (saved) {
      ['mode', 'count', 'minutes', 'shuffleQ', 'shuffleO', 'packet'].forEach(function (k) {
        if (saved[k] !== undefined) cfg[k] = saved[k];
      });
      if (!pack(cfg.packet) || pack(cfg.packet).id !== cfg.packet) cfg.packet = BANK[0].id;
    }
    renderPacks();
    syncConfig();
    checkResume();
  })();

})();
