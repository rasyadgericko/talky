/* ═══════════════════════════════════════════════════════
   CURSOR SPOTLIGHT
   ═══════════════════════════════════════════════════════ */
const spotlight = document.getElementById('spotlight');
window.addEventListener('mousemove', function(e) {
  spotlight.style.left = e.clientX + 'px';
  spotlight.style.top = e.clientY + 'px';
  spotlight.style.opacity = '1';
});
document.addEventListener('mouseleave', function() {
  spotlight.style.opacity = '0';
});

/* ═══════════════════════════════════════════════════════
   SCROLL REVEAL
   ═══════════════════════════════════════════════════════ */
const revealObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(e) {
    if (e.isIntersecting) e.target.classList.add('visible');
  });
}, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
document.querySelectorAll('.reveal').forEach(function(el) {
  revealObserver.observe(el);
});


/* ═══════════════════════════════════════════════════════
   HERO DEMO — Typewriter
   ═══════════════════════════════════════════════════════ */
var demoPhrases = [
  "Send the quarterly report to Sarah by end of day.",
  "Summarize this meeting in three bullet points.",
  "Make this email sound more professional.",
  "Translate the last paragraph to Japanese."
];
var demoActive = false;
var demoPhraseIdx = 0;
var demoCharIdx = 0;
var demoTimer = null;

var waveformEl = document.getElementById('demo-waveform');
for (var i = 0; i < 16; i++) {
  var bar = document.createElement('div');
  bar.className = 'demo-waveform-bar';
  bar.style.height = '2px';
  bar.style.opacity = '0.06';
  waveformEl.appendChild(bar);
}

function updateWaveform() {
  var bars = waveformEl.children;
  for (var i = 0; i < bars.length; i++) {
    if (demoActive) {
      bars[i].style.height = (4 + Math.sin(i * 0.7 + demoCharIdx * 0.4) * 14) + 'px';
      bars[i].style.opacity = (0.15 + Math.sin(i * 0.5) * 0.15).toString();
      bars[i].style.animation = 'waveform-bar ' + (0.3 + (i % 4) * 0.08) + 's ease-in-out infinite alternate';
      bars[i].style.animationDelay = (i * 0.04) + 's';
    } else {
      bars[i].style.height = '2px';
      bars[i].style.opacity = '0.06';
      bars[i].style.animation = 'none';
    }
  }
}

function demoType() {
  if (!demoActive) return;
  var phrase = demoPhrases[demoPhraseIdx];
  if (demoCharIdx < phrase.length) {
    demoCharIdx++;
    document.getElementById('demo-text').textContent = phrase.slice(0, demoCharIdx);
    updateWaveform();
    demoTimer = setTimeout(demoType, 28 + Math.random() * 35);
  } else {
    demoTimer = setTimeout(function() {
      demoPhraseIdx = (demoPhraseIdx + 1) % demoPhrases.length;
      demoCharIdx = 0;
      document.getElementById('demo-text').textContent = '';
      demoType();
    }, 2200);
  }
}

function toggleDemo() {
  demoActive = !demoActive;
  var box = document.getElementById('demo-box');
  var mic = document.getElementById('demo-mic');
  var output = document.getElementById('demo-output');
  var hint = document.getElementById('demo-hint');
  var status = document.getElementById('demo-status');
  if (demoActive) {
    box.classList.add('active');
    mic.classList.remove('idle'); mic.classList.add('recording');
    mic.innerHTML = '<div class="breathe-ring" style="position:absolute;inset:0;border-radius:50%;background:rgba(50,28,214,0.3);animation:breathe 1.5s ease-in-out infinite"></div><div class="demo-stop"></div>';
    output.classList.remove('closed'); output.classList.add('open');
    status.textContent = 'Listening...';
    hint.textContent = 'click to stop';
    demoCharIdx = 0;
    document.getElementById('demo-text').textContent = '';
    updateWaveform(); demoType();
  } else {
    if (demoTimer) clearTimeout(demoTimer);
    box.classList.remove('active');
    mic.classList.remove('recording'); mic.classList.add('idle');
    mic.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>';
    output.classList.remove('open'); output.classList.add('closed');
    status.textContent = 'Talky Island';
    hint.textContent = 'click to simulate';
    updateWaveform();
  }
}

/* ═══════════════════════════════════════════════════════
   TIMELINE GLOW ON SCROLL
   ═══════════════════════════════════════════════════════ */
var timelineEl = document.getElementById('timeline');
var timelineGlow = document.getElementById('timeline-glow');
var timelineHalo = document.getElementById('timeline-halo');

var timelineRAF;
function updateTimeline() {
  if (timelineRAF) return;
  timelineRAF = requestAnimationFrame(function() {
    var rect = timelineEl.getBoundingClientRect();
    var viewH = window.innerHeight;
    var start = rect.top - viewH;
    var end = rect.bottom - viewH * 0.5;
    var progress = Math.min(1, Math.max(0, (0 - start) / (end - start)));
    timelineGlow.style.height = (progress * 100) + '%';
    timelineHalo.style.top = (progress * 100) + '%';
    timelineHalo.style.opacity = progress > 0.02 ? '1' : '0';
    timelineRAF = null;
  });
}
window.addEventListener('scroll', updateTimeline, { passive: true });
updateTimeline();

/* ═══════════════════════════════════════════════════════
   TRANSFORM MODE — Interactive tabs
   ═══════════════════════════════════════════════════════ */
var transformModes = [
  {
    label: "Optimize",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z"/></svg>',
    before: "hey sarah can u send me the q3 numbers when ur free thx",
    after: "Hi Sarah, could you please send me the Q3 numbers when you have a moment? Thank you."
  },
  {
    label: "Summarize",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>',
    before: "The meeting covered three main topics: the product launch timeline which has been moved to March 15th, the marketing budget which was approved at $50K, and the new hire onboarding process which needs to be completed by end of month.",
    after: "Meeting summary:\n\u2022 Product launch moved to March 15\n\u2022 Marketing budget: $50K approved\n\u2022 New hire onboarding: due end of month"
  },
  {
    label: "Translate",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>',
    before: "Thank you for your email. I would be happy to schedule a meeting next week to discuss this further.",
    after: "\u30e1\u30fc\u30eb\u3042\u308a\u304c\u3068\u3046\u3054\u3056\u3044\u307e\u3059\u3002\u6765\u9031\u3001\u3053\u306e\u4ef6\u306b\u3064\u3044\u3066\u3055\u3089\u306b\u8a71\u3057\u5408\u3046\u305f\u3081\u306e\u4f1a\u8b70\u3092\u8a2d\u5b9a\u3055\u305b\u3066\u3044\u305f\u3060\u304d\u307e\u3059\u3002"
  },
  {
    label: "Fix Grammar",
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    before: "Their going to the store to buy there groceries and than they will go too the park",
    after: "They\u2019re going to the store to buy their groceries, and then they will go to the park."
  }
];
var currentMode = 0;

function buildModeButtons() {
  var container = document.getElementById('mode-buttons');
  container.innerHTML = '';
  transformModes.forEach(function(m, i) {
    var btn = document.createElement('button');
    btn.className = 'mode-btn' + (i === currentMode ? ' active' : '');
    btn.innerHTML = '<span class="mode-icon">' + m.icon + '</span>' + m.label;
    btn.onclick = function() { setMode(i); };
    container.appendChild(btn);
  });
}

function setMode(idx) {
  currentMode = idx;
  var m = transformModes[idx];
  document.getElementById('io-input-text').textContent = m.before;
  document.getElementById('io-output-text').textContent = m.after;
  document.getElementById('io-badge').textContent = m.label;
  buildModeButtons();
}

buildModeButtons();
setMode(0);

/* ═══════════════════════════════════════════════════════
   PRICING FEATURES
   ═══════════════════════════════════════════════════════ */
var checkSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="pricing-check"><path d="M20 6L9 17l-5-5"/></svg>';

var freeFeatures = ["Local Whisper transcription", "Basic speech-to-text dictation", "Works with any desktop app", "English language", "Audio waveform visualizer", "5,000 words per month", "Offline — no setup needed", "macOS & Windows"];
var proFeatures = ["Everything in Free", "Unlimited words", "Groq cloud transcription", "Groq AI transform (70B)", "Optimize, Refine & Summarize", "15+ languages supported", "Priority auto-updates"];

function buildPricingFeatures(id, features) {
  var el = document.getElementById(id);
  features.forEach(function(f) {
    var p = document.createElement('div');
    p.className = 'pricing-feature';
    p.innerHTML = checkSvg + f;
    el.appendChild(p);
  });
}
buildPricingFeatures('pricing-free-features', freeFeatures);
buildPricingFeatures('pricing-pro-features', proFeatures);

/* ═══════════════════════════════════════════════════════
   FAQ
   ═══════════════════════════════════════════════════════ */
var faqs = [
  { q: "Is Talky really free?", a: "Yes. The free plan includes local Whisper transcription bundled right in the app — no setup, no API keys, no account. You get 5,000 words per month in English. If you need more, Pro is $6/mo and unlocks unlimited words, 15+ languages, and AI transform." },
  { q: "Is my voice data private?", a: "On the free plan, everything runs locally via Whisper — your audio never leaves your device. Pro uses Groq's cloud API for faster transcription, but we never store or collect your data. Zero telemetry, zero data collection." },
  { q: "What are the system requirements?", a: "macOS (Apple Silicon & Intel) and Windows 10/11. About 300MB disk space. 8GB RAM recommended for local Whisper. The free plan works completely offline. Pro requires an internet connection for Groq cloud features." },
  { q: "How is this different from built-in dictation?", a: "Built-in dictation is basic speech-to-text. Talky adds a floating island UI that stays out of your way and works with any app. Pro users also get Groq cloud accuracy, AI Transform (optimize, summarize, translate with voice), and 15+ languages." },
  { q: "Do I need an API key or account?", a: "No. The free plan works entirely offline with bundled Whisper — just download and go. Pro features are handled through a subscription, no API key setup needed." },
  { q: "Why is Pro so affordable?", a: "Talky bundles Whisper AI locally so the free plan costs us nothing to run. For Pro, we keep infrastructure lean and pass the savings on — so you get powerful cloud AI features without the typical price tag." }
];

var faqList = document.getElementById('faq-list');
faqList.setAttribute('role', 'list');
faqs.forEach(function(faq, i) {
  var item = document.createElement('div');
  item.className = 'faq-item';
  item.setAttribute('role', 'listitem');
  item.innerHTML =
    '<button class="faq-q" onclick="toggleFaq(' + i + ')" aria-expanded="false" aria-controls="faq-a-' + i + '">' +
      '<span>' + faq.q + '</span>' +
      '<span class="faq-toggle" id="faq-toggle-' + i + '" aria-hidden="true">+</span>' +
    '</button>' +
    '<div class="faq-a" id="faq-a-' + i + '" role="region" aria-labelledby="faq-q-' + i + '"><p>' + faq.a + '</p></div>';
  item.querySelector('.faq-q').id = 'faq-q-' + i;
  faqList.appendChild(item);
});

function toggleFaq(idx) {
  var a = document.getElementById('faq-a-' + idx);
  var toggle = document.getElementById('faq-toggle-' + idx);
  var isOpen = a.classList.contains('open');
  // Close all
  document.querySelectorAll('.faq-a').forEach(function(el) { el.classList.remove('open'); });
  document.querySelectorAll('.faq-toggle').forEach(function(el) { el.classList.remove('open'); });
  document.querySelectorAll('.faq-q').forEach(function(el) { el.setAttribute('aria-expanded', 'false'); });
  if (!isOpen) {
    a.classList.add('open');
    toggle.classList.add('open');
    document.getElementById('faq-q-' + idx).setAttribute('aria-expanded', 'true');
  }
}

/* ═══════════════════════════════════════════════════════
   HERO SPARKLE PARTICLES — Canvas
   ═══════════════════════════════════════════════════════ */
(function() {
  var canvas = document.getElementById('hero-particles');
  var ctx = canvas.getContext('2d');
  var particles = [];
  var PARTICLE_COUNT = 80;
  var mouse = { x: null, y: null };

  function resize() {
    var section = canvas.parentElement;
    canvas.width = section.offsetWidth;
    canvas.height = section.offsetHeight;
    // Re-scatter particles across full canvas
    for (var i = 0; i < particles.length; i++) {
      particles[i].x = Math.random() * canvas.width;
      particles[i].y = Math.random() * canvas.height;
    }
  }
  resize();
  window.addEventListener('resize', resize);

  canvas.parentElement.addEventListener('mousemove', function(e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  canvas.parentElement.addEventListener('mouseleave', function() {
    mouse.x = null;
    mouse.y = null;
  });

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.5 + 0.4,
      speedX: (Math.random() - 0.5) * 0.25,
      speedY: (Math.random() - 0.5) * 0.25,
      opacity: Math.random() * 0.4 + 0.08,
      targetOpacity: Math.random() * 0.45 + 0.08,
      twinkleSpeed: Math.random() * 0.007 + 0.002,
      twinklePhase: Math.random() * Math.PI * 2,
    };
  }

  for (var i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(createParticle());
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.speedX;
      p.y += p.speedY;
      p.twinklePhase += p.twinkleSpeed;
      p.opacity = p.targetOpacity * (0.4 + 0.6 * Math.abs(Math.sin(p.twinklePhase)));

      if (mouse.x !== null) {
        var dx = p.x - mouse.x;
        var dy = p.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          var boost = 1 - dist / 130;
          p.opacity = Math.min(1, p.opacity + boost * 0.45);
          p.x += dx * 0.003;
          p.y += dy * 0.003;
        }
      }

      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = canvas.height + 10;
      if (p.y > canvas.height + 10) p.y = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120, 90, 240, ' + p.opacity + ')';
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  animate();
})();

/* ═══════════════════════════════════════════════════════
   CTA SPARKLE PARTICLES — Canvas
   ═══════════════════════════════════════════════════════ */
(function() {
  var canvas = document.getElementById('cta-particles');
  var ctx = canvas.getContext('2d');
  var particles = [];
  var PARTICLE_COUNT = 120;
  var mouse = { x: null, y: null };

  function resize() {
    var section = canvas.parentElement;
    canvas.width = section.offsetWidth;
    canvas.height = section.offsetHeight;
    // Re-scatter particles across full canvas
    for (var i = 0; i < particles.length; i++) {
      particles[i].x = Math.random() * canvas.width;
      particles[i].y = Math.random() * canvas.height;
    }
  }
  resize();
  window.addEventListener('resize', resize);

  // Track mouse relative to canvas
  canvas.parentElement.addEventListener('mousemove', function(e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  canvas.parentElement.addEventListener('mouseleave', function() {
    mouse.x = null;
    mouse.y = null;
  });

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.1,
      targetOpacity: Math.random() * 0.6 + 0.1,
      twinkleSpeed: Math.random() * 0.008 + 0.003,
      twinklePhase: Math.random() * Math.PI * 2,
    };
  }

  for (var i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(createParticle());
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      // Move
      p.x += p.speedX;
      p.y += p.speedY;

      // Twinkle
      p.twinklePhase += p.twinkleSpeed;
      p.opacity = p.targetOpacity * (0.4 + 0.6 * Math.abs(Math.sin(p.twinklePhase)));

      // Mouse interaction — glow brighter near cursor
      if (mouse.x !== null) {
        var dx = p.x - mouse.x;
        var dy = p.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          var boost = 1 - dist / 150;
          p.opacity = Math.min(1, p.opacity + boost * 0.5);
          // Gentle push away from cursor
          p.x += dx * 0.003;
          p.y += dy * 0.003;
        }
      }

      // Wrap around
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = canvas.height + 10;
      if (p.y > canvas.height + 10) p.y = -10;

      // Draw
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120, 90, 240, ' + p.opacity + ')';
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  // Only animate when CTA is near viewport
  var ctaSection = document.getElementById('download');
  var particlesRunning = false;

  var ctaObserver = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting && !particlesRunning) {
      particlesRunning = true;
      animate();
    }
  }, { threshold: 0.1 });
  ctaObserver.observe(ctaSection);


/* ═══════════════════════════════════════════════════════
   ANIMATED BEAM — Works Everywhere
   ═══════════════════════════════════════════════════════ */
(function() {
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var allBeams = [];
  var animStarted = false;

  function getCenter(el, container, containerRect) {
    var r = el.getBoundingClientRect();
    var c = containerRect;
    return { x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height / 2 };
  }

  function makeCurvedPath(from, to, curvature) {
    var cx = (from.x + to.x) / 2;
    var cy = (from.y + to.y) / 2 - (curvature || 0);
    return 'M ' + from.x + ',' + from.y + ' Q ' + cx + ',' + cy + ' ' + to.x + ',' + to.y;
  }

  function createEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach(function(k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  function addBeam(svg, defs, container, fromEl, toEl, opts, containerRect, containerW) {
    var from = getCenter(fromEl, container, containerRect);
    var to = getCenter(toEl, container, containerRect);
    var d = makeCurvedPath(from, to, opts.curvature || 0);
    var id = 'bg' + (Math.random() * 1e6 | 0);
    var W = containerW;

    // Gradient definition
    var grad = createEl('linearGradient', { id: id, gradientUnits: 'userSpaceOnUse', x1: '0', y1: '0', x2: '0', y2: '0' });
    var stops = [
      { offset: '0%', color: opts.c1, opacity: '0' },
      { offset: '10%', color: opts.c1, opacity: '1' },
      { offset: '70%', color: opts.c2, opacity: '1' },
      { offset: '100%', color: opts.c2, opacity: '0' }
    ];
    stops.forEach(function(s) {
      var st = createEl('stop', { offset: s.offset, 'stop-color': s.color, 'stop-opacity': s.opacity });
      grad.appendChild(st);
    });
    defs.appendChild(grad);

    // Base faint path
    svg.appendChild(createEl('path', { d: d, stroke: 'rgba(255,255,255,0.05)', 'stroke-width': '1.5', fill: 'none', 'stroke-linecap': 'round' }));

    // Animated beam path
    var beam = createEl('path', { d: d, stroke: 'url(#' + id + ')', 'stroke-width': '2', fill: 'none', 'stroke-linecap': 'round' });
    svg.appendChild(beam);

    allBeams.push({ grad: grad, from: from, to: to, W: W, duration: (opts.duration || 4) * 1000, delay: (opts.delay || 0) * 1000, startTime: null });
  }

  function runAnimation(ts) {
    allBeams.forEach(function(b) {
      if (!b.startTime) b.startTime = ts;
      var elapsed = ts - b.startTime - b.delay;
      if (elapsed < 0) return;
      var t = (elapsed % b.duration) / b.duration;
      // Gradient sweeps horizontally across SVG canvas width
      var x1 = (t - 0.1) * b.W;
      var x2 = t * b.W;
      b.grad.setAttribute('x1', x1);
      b.grad.setAttribute('x2', x2);
      b.grad.setAttribute('y1', b.from.y);
      b.grad.setAttribute('y2', b.to.y);
    });
    requestAnimationFrame(runAnimation);
  }

  function initBeams() {
    var container = document.getElementById('beam-container');
    var svg = document.getElementById('beam-svg');
    if (!container || !svg) return;

    // Clear
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    allBeams = [];

    var defs = createEl('defs', {});
    svg.appendChild(defs);

    var center = document.getElementById('bn-center');
    var left = ['bn1', 'bn2', 'bn3'].map(function(id) { return document.getElementById(id); });
    var right = ['bn4', 'bn5', 'bn6'].map(function(id) { return document.getElementById(id); });
    if (!center) return;

    // Batch-read layout to avoid forced reflow
    var containerRect = container.getBoundingClientRect();
    var containerW = container.offsetWidth;

    var curvatures = [-55, 0, 55];
    var curvatureColors = [['#321CD6','#5B4EFF'], ['#4F35E8','#321CD6'], ['#321CD6','#4F35E8']];
    var lc = curvatureColors;
    var rc = curvatureColors;

    left.forEach(function(el, i) {
      if (!el) return;
      addBeam(svg, defs, container, el, center, { curvature: curvatures[i], c1: lc[i][0], c2: lc[i][1], delay: i * 1.3, duration: 4 + i * 0.4 }, containerRect, containerW);
    });
    right.forEach(function(el, i) {
      if (!el) return;
      addBeam(svg, defs, container, center, el, { curvature: curvatures[i], c1: rc[i][0], c2: rc[i][1], delay: i * 1.3 + 0.65, duration: 4 + i * 0.4 }, containerRect, containerW);
    });

    if (!animStarted) {
      animStarted = true;
      requestAnimationFrame(runAnimation);
    }
  }

  var beamResizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(beamResizeTimer);
    beamResizeTimer = setTimeout(initBeams, 200);
  });

  // Init after layout settles
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initBeams, 150); });
  } else {
    setTimeout(initBeams, 150);
  }
}());
})();

/* ═══════════════════════════════════════════════════════
   SUPABASE AUTH — Gated Downloads
   ═══════════════════════════════════════════════════════ */
(function() {
  var SUPABASE_URL = 'https://hveankwjtfvcztcrurlm.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZWFua3dqdGZ2Y3p0Y3J1cmxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzExNTQsImV4cCI6MjA4ODY0NzE1NH0.fyfBlM_kknWTD6hI_hP7CYfjmYZXSZZc9I1cZRf6URE';
  var DOWNLOAD_URL = 'https://github.com/rasyadgericko/talky/releases/download/v0.3.3/Talky-0.3.3-arm64.dmg';

  var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  var currentUser = null;
  var isSignUp = true;
  var pendingUpgrade = false;

  // DOM refs
  var overlay = document.getElementById('auth-overlay');
  var closeBtn = document.getElementById('auth-close');
  var form = document.getElementById('auth-form');
  var emailInput = document.getElementById('auth-email');
  var passwordInput = document.getElementById('auth-password');
  var errorEl = document.getElementById('auth-error');
  var submitBtn = document.getElementById('auth-submit');
  var titleEl = document.getElementById('auth-title');
  var subtitleEl = document.getElementById('auth-subtitle');
  var switchTextEl = document.getElementById('auth-switch-text');
  var switchBtn = document.getElementById('auth-switch-btn');
  var googleBtn = document.getElementById('auth-google');
  var githubBtn = document.getElementById('auth-github');

  // -- Modal open/close --
  window.openAuthModal = function(mode) {
    isSignUp = mode !== 'signin';
    updateModalUI();
    overlay.classList.add('open');
    overlay.removeAttribute('inert');
    errorEl.textContent = '';
    emailInput.focus();
  }

  function closeAuthModal() {
    overlay.classList.remove('open');
    overlay.setAttribute('inert', '');
    form.reset();
    errorEl.textContent = '';
  }

  function updateModalUI() {
    if (isSignUp) {
      titleEl.textContent = 'Create your account';
      subtitleEl.textContent = 'Sign up to download Talky for free.';
      submitBtn.textContent = 'Create account';
      switchTextEl.textContent = 'Already have an account?';
      switchBtn.textContent = 'Sign in';
      passwordInput.setAttribute('autocomplete', 'new-password');
    } else {
      titleEl.textContent = 'Welcome back';
      subtitleEl.textContent = 'Sign in to download Talky.';
      submitBtn.textContent = 'Sign in';
      switchTextEl.textContent = "Don't have an account?";
      switchBtn.textContent = 'Sign up';
      passwordInput.setAttribute('autocomplete', 'current-password');
    }
  }

  closeBtn.addEventListener('click', closeAuthModal);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeAuthModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeAuthModal();
  });

  switchBtn.addEventListener('click', function() {
    isSignUp = !isSignUp;
    updateModalUI();
    errorEl.textContent = '';
  });

  // -- Email/Password Auth --
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var email = emailInput.value.trim();
    var password = passwordInput.value;
    errorEl.textContent = '';
    submitBtn.disabled = true;

    if (isSignUp) {
      supabase.auth.signUp({ email: email, password: password })
        .then(function(res) {
          submitBtn.disabled = false;
          if (res.error) {
            errorEl.textContent = res.error.message;
            return;
          }
          // Sign-up success
          closeAuthModal();
          if (pendingUpgrade) {
            pendingUpgrade = false;
            window.open('https://polar.sh', '_blank');
          } else {
            window.location.href = '/thankyou';
          }
        });
    } else {
      supabase.auth.signInWithPassword({ email: email, password: password })
        .then(function(res) {
          submitBtn.disabled = false;
          if (res.error) {
            errorEl.textContent = res.error.message;
            return;
          }
          // Sign-in success
          currentUser = res.data.user;
          closeAuthModal();
          updateNavAuth();
          if (pendingUpgrade) {
            pendingUpgrade = false;
            window.open('https://polar.sh', '_blank');
          }
        });
    }
  });

  // -- Social Auth --
  googleBtn.addEventListener('click', function() {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/thankyou' }
    });
  });

  githubBtn.addEventListener('click', function() {
    supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin + '/thankyou' }
    });
  });

  // -- Upgrade to Pro --
  window.handleUpgrade = function(e) {
    e.preventDefault();
    if (currentUser) {
      // TODO: Replace with actual Polar.sh checkout URL once created
      window.open('https://polar.sh', '_blank');
    } else {
      pendingUpgrade = true;
      openAuthModal('signup');
    }
  };

  // -- Download gating --
  window.handleDownload = function(e) {
    e.preventDefault();
    if (currentUser) {
      trackAndDownload();
    } else {
      openAuthModal('signup');
    }
  };

  function trackAndDownload() {
    if (currentUser) {
      supabase.from('downloads').insert({
        user_id: currentUser.id,
        platform: 'macos',
        version: '0.2.0'
      }).then(function() {});
    }
    window.location.href = DOWNLOAD_URL;
  }

  // -- Check session on load --
  function updateNavAuth() {
    var loggedOut = document.getElementById('nav-auth-logged-out');
    var loggedIn = document.getElementById('nav-auth-logged-in');
    if (currentUser) {
      loggedOut.style.display = 'none';
      loggedIn.style.display = '';
    } else {
      loggedOut.style.display = '';
      loggedIn.style.display = 'none';
    }
  }

  window.handleSignOut = function(e) {
    e.preventDefault();
    supabase.auth.signOut().then(function() {
      currentUser = null;
      updateNavAuth();
    });
  };

  supabase.auth.getSession().then(function(res) {
    if (res.data.session) {
      currentUser = res.data.session.user;
    }
    updateNavAuth();
  });

  // -- Listen for auth state changes --
  supabase.auth.onAuthStateChange(function(event, session) {
    if (session) {
      currentUser = session.user;
    } else {
      currentUser = null;
    }
    updateNavAuth();
  });
})();
