// ============================================================
// Nucleon
// HTML5 Canvas · 20 Levels · 1-2 Player Co-op · Power-Ups
// Platforms · Wind Gusts · Timer Acceleration · Platform Lever
// Elements: Kr · Ar · Ne · He · H · ²³⁵U (Hazard)
// Unstable Atom Mechanic (☢ 4-way split, propagates)
// ============================================================
"use strict";

// ===================== CONSTANTS =====================
const W = 800, H = 600, GROUND = H - 40, TWO_PI = Math.PI * 2, FPS = 60;
const GRAVITY = 0.15, BOUNCE = 0.85, P_SPEED = 6, P_W = 30, P_H = 44, HARP_SPEED = 8;
const ATOM_SPD = 1.0;

// sz: 4=Krypton, 3=Argon, 2=Neon, 1=Helium, 0=Hydrogen, 'u'=Uranium-235
const ATOM_DEFS = {
  4: { r: 90,  pts: 2000, orb: 4, nE: 8, nR: 30, sym: 'Kr' },
  3: { r: 60,  pts: 1000, orb: 3, nE: 6, nR: 22, sym: 'Ar' },
  2: { r: 36,  pts: 500,  orb: 2, nE: 4, nR: 14, sym: 'Ne' },
  1: { r: 18,  pts: 250,  orb: 1, nE: 2, nR: 8,  sym: 'He' },
  0: { r: 10,  pts: 100,  orb: 1, nE: 1, nR: 5,  sym: 'H' },
  u: { r: 30,  pts:-500,  orb: 3, nE: 8, nR: 14, sym: '²³⁵U' },
};
const ATOM_COL = {
  4: { c:"#c8ffc8", g:"rgba(200,255,200,0.3)",  o:"rgba(200,255,200,0.25)", e:"#c8ffc8", ou:"rgba(200,255,200,0.08)" },
  3: { c:"#c080ff", g:"rgba(192,128,255,0.3)",  o:"rgba(192,128,255,0.25)", e:"#c080ff", ou:"rgba(192,128,255,0.08)" },
  2: { c:"#ff6a33", g:"rgba(255,106,51,0.3)",   o:"rgba(255,106,51,0.25)",  e:"#ff6a33", ou:"rgba(255,106,51,0.08)" },
  1: { c:"#fffaaa", g:"rgba(255,250,170,0.3)",  o:"rgba(255,250,170,0.25)", e:"#fffaaa", ou:"rgba(255,250,170,0.08)" },
  0: { c:"#ff69b4", g:"rgba(255,105,180,0.3)",  o:"rgba(255,105,180,0.25)", e:"#ff69b4", ou:"rgba(255,105,180,0.08)" },
  u: { c:"#39ff14", g:"rgba(57,255,20,0.3)",    o:"rgba(57,255,20,0.3)",    e:"#39ff14", ou:"rgba(100,0,200,0.1)" },
};
const BOUNCE_VEL = { 4:8.5, 3:7.5, 2:6.5, 1:5.5, 0:4.5, u:6.5 };

const PU_TYPES = [
  { id:"timeSlow",       lbl:"TIME DILATION", ic:"⏳", col:"#bf5fff", dur:5*FPS,  desc:"Slows all atoms to 40% speed for 5 seconds." },
  { id:"splitBeam",      lbl:"SPLIT BEAM",    ic:"⚡",  col:"#fff700", dur:8*FPS,  desc:"Shoot 2 rays at once for 8 seconds." },
  { id:"persistentBeam", lbl:"TRACTOR BEAM",  ic:"║",  col:"#00d4ff", dur:8*FPS,  desc:"Ray stays on screen until it hits an atom." },
  { id:"shield",         lbl:"CONTAINMENT",   ic:"☢",  col:"#39ff14", dur:3*FPS,  desc:"Grants 3 seconds of total invincibility." },
  { id:"overclock",      lbl:"OVERCLOCK",     ic:"»",  col:"#ff8833", dur:5*FPS,  desc:"Player and ray move at 2× speed for 5 seconds." },
  { id:"extraLife",      lbl:"EXTRA LIFE",    ic:"♥",  col:"#ff4444", dur:0,      desc:"Restores one life (max 9)." },
  { id:"tripleShot",     lbl:"TRI-BEAM",      ic:"Ψ",  col:"#ff55ff", dur:5*FPS,  desc:"Fires 3 rays (up, 45° left, 45° right) for 5s." },
  { id:"jetpack",        lbl:"JETPACK",        ic:"⇪",  col:"#ffaa00", dur:3*FPS,  desc:"Fly freely for 3s. Ray auto-fires downward." },
  { id:"vaporize",       lbl:"VAPORIZE",       ic:"✦",  col:"#ff2222", dur:0,      desc:"Instantly destroys a random atom on screen." },
];
const PU_SPAWN_MIN = 3*FPS, PU_SPAWN_MAX = 8*FPS, PU_R = 14;

const THEME = [
  { body:"#1a6b1a", suit:"#39ff14", visor:"#adffad", acc:"#0d3d0d", harp:"#39ff14", hGlow:"rgba(57,255,20,0.6)", lbl:"P1" },
  { body:"#1a4a6b", suit:"#00d4ff", visor:"#adf0ff", acc:"#0d2d3d", harp:"#00d4ff", hGlow:"rgba(0,212,255,0.6)", lbl:"P2" },
];

// Controls use event.code (physical key position) so keyboard layout doesn't matter
const CTRL = [
  { l:["KeyA"], r:["KeyD"], s:["KeyW"], u:["KeyW"], d:["KeyS"] },
  { l:["ArrowLeft"], r:["ArrowRight"], s:["ArrowUp","Space"], u:["ArrowUp"], d:["ArrowDown"] },
];

const WIND_CALM_MIN = 12*FPS, WIND_CALM_MAX = 20*FPS;
const WIND_GUST_MIN = 5*FPS,  WIND_GUST_MAX = 10*FPS;

// ===================== TOUCH CONTROLS =====================
const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
const TOUCH_BTNS = [
  { id:'left',  x:20,  y:500, w:85, h:85, label:'◀', keys:['KeyA'] },
  { id:'right', x:150, y:500, w:85, h:85, label:'▶', keys:['KeyD'] },
  { id:'shoot', x:695, y:500, w:85, h:85, label:'▲', keys:['KeyW'] },
  { id:'pause', x:730, y:8,   w:58, h:34, label:'❚❚', keys:['KeyP'] },
];

// ===================== HELPERS =====================
function dist(x1,y1,x2,y2){ const a=x1-x2,b=y1-y2; return Math.sqrt(a*a+b*b); }
function rr(a,b){ return Math.random()*(b-a)+a; }
function ri(a,b){ return Math.floor(rr(a,b+1)); }
function clamp(v,lo,hi){ return v<lo?lo:v>hi?hi:v; }

// ===================== I18N (ENGLISH / RUSSIAN) =====================
let gameLang = (navigator.language||navigator.userLanguage||'en').startsWith('ru')?'ru':'en';
(function() {
  const urlLang = new URLSearchParams(location.search).get('lang');
  if (urlLang === 'ru' || urlLang === 'en') gameLang = urlLang;
})();
const I18N_RU = {
  // Menu
  'Nucleon':'Нуклеон',
  'SPLIT ATOMS · SURVIVE THE CHAIN REACTION':'РАСЩЕПЛЯЙ АТОМЫ · ВЫЖИВИ В ЦЕПНОЙ РЕАКЦИИ',
  'PLAYERS: ① SOLO':'ИГРОКИ: ① СОЛО','PLAYERS: ②  CO-OP':'ИГРОКИ: ②  КООПЕРАТИВ',
  'MODE: ☰ NORMAL':'РЕЖИМ: ☰ НОРМАЛЬНЫЙ','MODE: ☠ HARDCORE':'РЕЖИМ: ☠ ХАРДКОР',
  'SOUND: ON ♪':'ЗВУК: ВКЛ ♪','SOUND: OFF ✕':'ЗВУК: ВЫКЛ ✕',
  '⚛  ENCYCLOPEDIA':'⚛  ЭНЦИКЛОПЕДИЯ','▶  START REACTOR':'▶  ЗАПУСТИТЬ РЕАКТОР',
  'Normal: Level select, fresh lives per level':'Нормальный: Выбор уровня, свежие жизни на каждый уровень',
  'Hardcore: All levels in sequence, lives carry over':'Хардкор: Все уровни подряд, жизни переносятся',
  'P1: A/D move · W shoot   |   P2: ←/→ move · ↑/Space shoot':'И1: A/D движение · W стрелять   |   И2: ←/→ движение · ↑/Space стрелять',
  'H · He · Ne · Ar · Kr · ²³⁵U — 20 LEVELS':'H · He · Ne · Ar · Kr · ²³⁵U — 20 УРОВНЕЙ',
  'Arrow keys / Enter to navigate · P or ESC to pause':'Стрелки / Ввод навигация · P или ESC пауза',
  // Encyclopedia
  'ENCYCLOPEDIA':'ЭНЦИКЛОПЕДИЯ',
  '⚛ ELEMENTS':'⚛ ЭЛЕМЕНТЫ','⚡ ISOTOPE CANISTERS':'⚡ ИЗОТОПНЫЕ КАНИСТРЫ','⌨ HOW TO PLAY':'⌨ КАК ИГРАТЬ',
  'ESC — BACK TO MENU':'ESC — ВЕРНУТЬСЯ В МЕНЮ',
  '← → or click tabs to switch pages':'← → или клик по вкладкам для переключения страниц',
  'ELEMENT':'ЭЛЕМЕНТ','SIZE':'РАЗМЕР','RADIUS':'РАДИУС','POINTS':'ОЧКИ',
  'BOUNCE':'ОТСКОК','ORBITS':'ОРБИТЫ','ELECTRONS':'ЭЛЕКТРОНЫ',
  'Krypton':'Криптон','Argon':'Аргон','Neon':'Неон','Helium':'Гелий','Hydrogen':'Водород','Uranium-235':'Уран-235',
  'Regular':'Обычный','HAZARD':'ОПАСНОСТЬ',
  'Largest atom. 4 tilted elliptical orbits. First appears on Level 9.':'Самый большой атом. 4 наклонные эллиптические орбиты. Появляется с уровня 9.',
  '3 tilted orbits. Classic symmetry. Main atom throughout all levels.':'3 наклонные орбиты. Классическая симметрия. Основной атом на всех уровнях.',
  '2 crossing elliptical orbits. Produced by Uranium fission.':'2 пересекающиеся эллиптические орбиты. Производится из деления Урана.',
  'Tiny. 1 elliptical orbit with 2 electrons.':'Маленький. 1 эллиптическая орбита с 2 электронами.',
  'Smallest atom. 1 orbit, 1 electron. Sparkly poof on destroy.':'Самый маленький атом. 1 орбита, 1 электрон. Искристый взрыв при уничтожении.',
  'DO NOT HIT! Fission → 10 Neon flood. Costs -500 pts.':'НЕ ПОПАДИ! Деление → 10 Неонов. Стоит -500 очков.',
  'Splits → 2× {0}  (unstable: 4×)':'Расщепляется → 2× {0} (нестабильный: 4×)',
  'Fission → 10× Neon atoms':'Деление → 10× Неоновых атомов',
  'Final atom — destroyed on hit':'Финальный атом — уничтожается при попадании',
  // Power-ups
  'ISOTOPE CANISTERS — Appear every 3-8 seconds. Walk into them to activate.':'ИЗОТОПНЫЕ КАНИСТРЫ — Появляются каждые 3-8 секунд. Подойдите к ним для активации.',
  'instant':'мгновенно',
  'TIME DILATION':'РАСТЯЖЕНИЕ ВРЕМЕНИ','SPLIT BEAM':'РАСЩЕПЛЁННЫЙ ЛУЧ','TRACTOR BEAM':'ТЯГОВЫЙ ЛУЧ',
  'CONTAINMENT':'СОДЕРЖАНИЕ','OVERCLOCK':'РАЗГОН','EXTRA LIFE':'ДОПОЛНИТЕЛЬНАЯ ЖИЗНЬ',
  'TRI-BEAM':'ТРИ-ЛУЧ','JETPACK':'РЕАКТИВНЫЙ РАНЕЦ','VAPORIZE':'ИСПАРЕНИЕ',
  'Slows all atoms to 40% speed for 5 seconds.':'Замедляет все атомы до 40% скорости на 5 секунд.',
  'Shoot 2 rays at once for 8 seconds.':'Стрельба 2 лучами одновременно на 8 секунд.',
  'Ray stays on screen until it hits an atom.':'Луч остаётся на экране, пока не попадёт в атом.',
  'Grants 3 seconds of total invincibility.':'Даёт 3 секунды полной неуязвимости.',
  'Player and ray move at 2× speed for 5 seconds.':'Игрок и луч двигаются в 2× скорости на 5 секунд.',
  'Restores one life (max 9).':'Восстанавливает одну жизнь (макс. 9).',
  'Fires 3 rays (up, 45° left, 45° right) for 5s.':'Стреляет 3 лучами (вверх, 45° влево, 45° вправо) на 5с.',
  'Fly freely for 3s. Ray auto-fires downward.':'Летайте свободно 3с. Луч автоматически стреляет вниз.',
  'Instantly destroys a random atom on screen.':'Мгновенно уничтожает случайный атом на экране.',
  // How to play
  'CONTROLS':'УПРАВЛЕНИЕ',
  'PLAYER 1:  A / D = move left/right   W = shoot ray':'ИГРОК 1:  A / D = движение влево/вправо   W = стрелять лучом',
  'PLAYER 2:  ← / → = move left/right   ↑ / Space = shoot ray':'ИГРОК 2:  ← / → = движение влево/вправо   ↑ / Space = стрелять лучом',
  'P or ESC = pause    (works with any keyboard layout)':'P или ESC = пауза    (работает с любой раскладкой клавиатуры)',
  'OBJECTIVE':'ЦЕЛЬ',
  'Destroy all regular atoms by shooting rays at them.':'Уничтожьте все обычные атомы, стреляя в них лучами.',
  'Atoms split into smaller atoms when hit (×2, or ×4 if unstable).':'Атомы расщепляются на меньшие при попадании (×2, или ×4 если нестабильные).',
  'Clear every non-Uranium atom to complete a level.':'Уничтожьте все не-Урановые атомы, чтобы пройти уровень.',
  'ATOMS & SPLITTING':'АТОМЫ И РАСЩЕПЛЕНИЕ',
  'Kr → 2 Ar → 2 Ne → 2 He → 2 H → destroyed':'Kr → 2 Ar → 2 Ne → 2 He → 2 H → уничтожен',
  'Unstable atoms (☢ glow, from Level 4) split into 4 instead of 2.':'Нестабильные атомы (☢ свечение, с уровня 4) расщепляются на 4 вместо 2.',
  'All children of an unstable atom are also unstable!':'Все дочерние атомы нестабильного также нестабильны!',
  '²³⁵U (Uranium) = HAZARD. Hitting it causes fission → 10 Neon flood, -500 pts.':'²³⁵U (Уран) = ОПАСНОСТЬ. Попадание вызывает деление → 10 Неонов, -500 очков.',
  'MECHANICS':'МЕХАНИКИ',
  'Timer: each level has a countdown. When it expires → atoms accelerate!':'Таймер: у каждого уровня обратный отсчёт. По истечении → атомы ускоряются!',
  'Wind: random gusts push atoms left or right (varies per level).':'Ветер: случайные порывы толкают атомы влево/вправо (зависит от уровня).',
  'Platforms: static or moving barriers that block rays and atoms.':'Платформы: статичные или движущиеся барьеры, блокирующие лучи и атомы.',
  'Lever: walk into it to lock/unlock all moving platforms.':'Рычаг: подойдите, чтобы заблокировать/разблокировать все движущиеся платформы.',
  'Losing a life: -2000 pts. Player respawns at the same spot.':'Потеря жизни: -2000 очков. Игрок возрождается на том же месте.',
  'GAME MODES':'РЕЖИМЫ ИГРЫ',
  'Normal: select any unlocked level. Fresh lives each attempt (5 or 7).':'Нормальный: выбирайте любой разблокированный уровень. Свежие жизни на каждую попытку (5 или 7).',
  'Hardcore: play all 20 levels in order. Lives carry over. Bonus life every 5 levels.':'Хардкор: играйте все 20 уровней подряд. Жизни переносятся. Бонусная жизнь каждые 5 уровней.',
  // Level select & HUD
  'SELECT LEVEL':'ВЫБОР УРОВНЯ','SCORE: {0}':'СЧЁТ: {0}','{0} atoms · {1}s':'{0} атомы · {1}s',
  'LEVEL {0}':'УРОВЕНЬ {0}',' [HARDCORE]':' [ХАРДКОР]','⚠ ACCELERATED':'⚠ УСКОРЕННЫЕ',
  'P1':'И1','P2':'И2','LIVES {0}':'ЖИЗНИ {0}','☠ DEAD':'☠ МЁРТВ',
  'WIND →':'ВЕТЕР →','← WIND':'← ВЕТЕР','STRONG ':'СИЛЬНЫЙ ',
  '■ PLATFORMS LOCKED ■':'■ ПЛАТФОРМЫ ЗАБЛОКИРОВАНЫ ■',
  '☢ UNSTABLE ATOM — SPLITS ×4 ☢':'☢ НЕСТАБИЛЬНЫЙ АТОМ — РАСЩЕПЛЕНИЕ ×4 ☢',
  '[P / ESC] PAUSE':'[P / ESC] ПАУЗА','■ LOCK':'■ БЛОК','▶ FREE':'▶ СВОБОДНО',
  // Intro
  'ATOMS: {0}   |   TIMER: {1}s':'АТОМЫ: {0}   |   ТАЙМЕР: {1}s',
  '⚛ KRYPTON (Kr) DETECTED — LARGE ATOM':'⚛ КРИПТОН (Kr) ОБНАРУЖЕН — БОЛЬШОЙ АТОМ',
  '☢ URANIUM-235 DETECTED — DO NOT HIT!':'☢ УРАН-235 ОБНАРУЖЕН — НЕ ПОПАДИ!',
  '☢ UNSTABLE ATOMS MAY APPEAR — SPLIT ×4':'☢ НЕСТАБИЛЬНЫЕ АТОМЫ МОГУТ ПОЯВИТЬСЯ — РАСЩЕПЛЕНИЕ ×4',
  'WIND GUSTS: STRONG':'ПОРЫВЫ ВЕТРА: СИЛЬНЫЕ','WIND GUSTS: MODERATE':'ПОРЫВЫ ВЕТРА: СРЕДНИЕ','WIND GUSTS: MILD':'ПОРЫВЫ ВЕТРА: СЛАБЫЕ',
  'PLATFORMS: {0}':'ПЛАТФОРМЫ: {0}','PLATFORM LEVER AVAILABLE':'РЫЧАГ ПЛАТФОРМ ДОСТУПЕН',
  // Pause
  'PAUSED':'ПАУЗА','▶  CONTINUE':'▶  ПРОДОЛЖИТЬ','☰  CHOOSE LEVEL':'☰  ВЫБОР УРОВНЯ',
  '⌂  RETURN HOME':'⌂  ВЕРНУТЬСЯ ДОМОЙ','Press P or ESC to resume':'Нажмите P или ESC для продолжения',
  // Level complete / Game over / Victory
  'LEVEL COMPLETE':'УРОВЕНЬ ПРОЙДЕН','NEXT: LEVEL {0} — {1}':'СЛЕДУЮЩИЙ: УРОВЕНЬ {0} — {1}',
  'MELTDOWN ☢':'РАСПЛАВ ☢','REACHED LEVEL {0} — {1}':'ДОСТИГ УРОВНЯ {0} — {1}',
  'FINAL SCORE: {0}':'ФИНАЛЬНЫЙ СЧЁТ: {0}',
  'CLICK OR PRESS ENTER TO RETRY':'КЛИК ИЛИ ВВОД ДЛЯ ПОВТОРА',
  'CLICK OR PRESS ENTER TO RETURN':'КЛИК ИЛИ ВВОД ДЛЯ ВОЗВРАТА',
  'FISSION COMPLETE ✦':'ДЕЛЕНИЕ ЗАВЕРШЕНО ✦','ALL 20 LEVELS CLEARED!':'ВСЕ 20 УРОВНЕЙ ПРОЙДЕНЫ!',
  'VAPORIZED ☢':'ИСПАРЁН ☢',
  // Level names
  'FIRST CONTACT':'ПЕРВЫЙ КОНТАКТ','CONTAINMENT BREACH':'НАРУШЕНИЕ СОДЕРЖАНИЯ','HALF LIFE':'ПЕРИОД ПОЛУРАСПАДА',
  'CHAIN REACTION':'ЦЕПНАЯ РЕАКЦИЯ','CRITICAL MASS':'КРИТИЧЕСКАЯ МАССА','FLUX CAPACITY':'ЁМКОСТЬ ПОТОКА',
  'ISOTOPE DECAY':'РАСПАД ИЗОТОПА','REACTOR CORE':'ЯДРО РЕАКТОРА','NEUTRON STORM':'НЕЙТРОННЫЙ ШТОРМ',
  'CENTRIFUGE':'ЦЕНТРИФУГА','DARK MATTER':'ТЁМНАЯ МАТЕРИЯ','QUANTUM TUNNEL':'КВАНТОВЫЙ ТУННЕЛЬ',
  'PROTON COLLIDER':'ПРОТОННЫЙ КОЛЛАЙДЕР','GAMMA BURST':'ГАММА-ВСПЛЕСК','FUSION CORE':'ЯДРО СИНТЕЗА',
  'ANTIMATTER':'АНТИМАТЕРИЯ','SUPERCRITICAL':'СУПЕРКРИТИЧЕСКИЙ','SOLAR FLARE':'СОЛНЕЧНАЯ ВСПЫШКА',
  'EVENT HORIZON':'ГОРИЗОНТ СОБЫТИЙ','BIG BANG':'БОЛЬШОЙ ВЗРЫВ',
  // Rewarded ad
  '▶ WATCH AD FOR +1 LIFE':'▶ СМОТРЕТЬ РЕКЛАМУ ЗА +1 ЖИЗНЬ',
};
/** Translate key; optional {0},{1},… placeholders filled by extra args */
function T(key){
  let s=(gameLang==='ru'&&I18N_RU[key]!==undefined)?I18N_RU[key]:key;
  for(let i=1;i<arguments.length;i++) s=s.replace('{'+String(i-1)+'}',arguments[i]);
  return s;
}

// ===================== CRAZYGAMES SDK WRAPPER =====================
const CG = {
  _playing: false,
  get sdk() { try { return window.CrazyGames && window.CrazyGames.SDK; } catch(e) { return null; } },
  get env() { try { return this.sdk ? this.sdk.environment : 'disabled'; } catch(e) { return 'disabled'; } },
  get available() { return this.env !== 'disabled'; },
  gameplayStart() {
    if (!this.available || this._playing) return;
    this._playing = true;
    try { this.sdk.game.gameplayStart(); } catch(e) {}
  },
  gameplayStop() {
    if (!this.available || !this._playing) return;
    this._playing = false;
    try { this.sdk.game.gameplayStop(); } catch(e) {}
  },
  happytime() {
    if (!this.available) return;
    try { this.sdk.game.happytime(); } catch(e) {}
  },
  requestAd(type, callbacks) {
    if (!this.available) { if (callbacks && callbacks.adError) callbacks.adError({code:'disabled',message:'SDK not available'}); return; }
    try { this.sdk.ad.requestAd(type, callbacks); } catch(e) { if (callbacks && callbacks.adError) callbacks.adError(e); }
  },
  getItem(key) {
    if (this.available) try { const v = this.sdk.data.getItem(key); if (v !== null) return v; } catch(e) {}
    try { return localStorage.getItem(key); } catch(e) { return null; }
  },
  setItem(key, value) {
    if (this.available) try { this.sdk.data.setItem(key, String(value)); } catch(e) {}
    try { localStorage.setItem(key, String(value)); } catch(e) {}
  },
  get muteAudio() {
    if (this.available) try { return !!this.sdk.game.settings.muteAudio; } catch(e) {}
    return false;
  },
  addSettingsChangeListener(fn) {
    if (this.available) try { this.sdk.game.addSettingsChangeListener(fn); } catch(e) {}
  },
  async init() {
    if (!this.sdk) return;
    try { await this.sdk.init(); } catch(e) {}
  }
};

// ===================== YANDEX GAMES SDK WRAPPER (disabled for portfolio) =====================
const YG = {
  _sdk: null, _player: null, _lb: null,
  get available(){ return false; },
  async init(){ return false; },
  ready(){},
  gameplayStart(){},
  gameplayStop(){},
  showFullscreenAdv(cb){ if(cb.onClose) cb.onClose(false); },
  showRewardedVideo(cb){
    if(cb.onRewarded) cb.onRewarded();
    if(cb.onClose) cb.onClose();
  },
  saveData(){},
  async loadData(){ return null; },
  submitScore(){}
};

// ===================== BROWSER PREVENTION =====================
window.addEventListener("wheel", e => e.preventDefault(), { passive: false });
window.addEventListener("contextmenu", e => e.preventDefault());
window.addEventListener("keydown", e => {
  if(["Tab"].includes(e.key)) e.preventDefault();
});

// Block touch scroll / pull-to-refresh on non-canvas areas (Yandex Games 1.10.2)
document.addEventListener('touchmove', e => {
  if (!e.target.closest('canvas')) e.preventDefault();
}, { passive: false });
document.addEventListener('touchstart', e => {
  if (!e.target.closest('canvas')) e.preventDefault();
}, { passive: false });
document.body.style.touchAction = 'none';
document.body.style.overscrollBehavior = 'none';
document.documentElement.style.touchAction = 'none';
document.documentElement.style.overscrollBehavior = 'none';

// ===================== RESPONSIVE CANVAS =====================
function _cgResize() {
  const cv = document.getElementById('gameCanvas');
  const ctr = document.getElementById('gameContainer');
  if (!cv || !ctr) return;
  const ratio = W / H;
  const vw = window.innerWidth, vh = window.innerHeight;
  let w, h;
  if (vw / vh > ratio) { h = vh; w = vh * ratio; }
  else { w = vw; h = vw / ratio; }
  ctr.style.width = w + 'px';
  ctr.style.height = h + 'px';
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  // Set canvas pixel buffer to actual display size for sharp rendering
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
}
window.addEventListener('resize', _cgResize);
_cgResize();

// ===================== SOUND MANAGER =====================
class SFX {
  constructor(){ this.on=true; this.cgMuted=false; this.ctx=null; }
  init(){ if(this.ctx)return; try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){this.on=false;} }
  bip(f,d,t,v){
    if(!this.on||this.cgMuted||!this.ctx)return;
    try{ const o=this.ctx.createOscillator(),g=this.ctx.createGain();
      o.connect(g);g.connect(this.ctx.destination);o.type=t||'sine';o.frequency.value=f;
      g.gain.setValueAtTime(v||0.1,this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+d);
      o.start();o.stop(this.ctx.currentTime+d);
    }catch(e){}
  }
  shoot(){ this.bip(900,0.06,'square',0.08); }
  pop(s){ this.bip(300-s*50,0.15,'sine',0.1); }
  pickup(){ this.bip(600,0.08);setTimeout(()=>this.bip(800,0.1),80); }
  hit(){ this.bip(120,0.3,'sawtooth',0.12); }
  lvlDone(){ [400,500,600,800].forEach((f,i)=>setTimeout(()=>this.bip(f,0.2),i*120)); }
  over(){ [400,300,200,100].forEach((f,i)=>setTimeout(()=>this.bip(f,0.3,'sawtooth',0.1),i*150)); }
  click(){ this.bip(500,0.04,'square',0.06); }
  tick(){ this.bip(200,0.08,'square',0.06); }
  fission(){ [200,400,150,500,100].forEach((f,i)=>setTimeout(()=>this.bip(f,0.15,'sawtooth',0.12),i*40)); }
  unstable(){ this.bip(350,0.12,'triangle',0.08); setTimeout(()=>this.bip(450,0.1,'triangle',0.06),100); }
}
const sfx = new SFX();

// ===================== INPUT (uses event.code for layout-independence) =====================
class Input {
  constructor(){
    this.held=new Set(); this.jp=new Set();
    const prev=new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space","KeyA","KeyD","KeyW","KeyS"]);
    window.addEventListener("keydown",e=>{
      if(prev.has(e.code))e.preventDefault();
      if(!this.held.has(e.code))this.jp.add(e.code);
      this.held.add(e.code);
    });
    window.addEventListener("keyup",e=>this.held.delete(e.code));
  }
  any(keys){ return keys.some(k=>this.held.has(k)); }
  jany(keys){ return keys.some(k=>this.jp.has(k)); }
  end(){ this.jp.clear(); }
}

// ===================== TOUCH CONTROLS CLASS =====================
class TouchControls {
  constructor(canvas, input){
    this.cv=canvas; this.inp=input;
    this.active=IS_TOUCH; this.visible=false;
    this.pressed=new Set(); this._map=new Map();
    if(!this.active) return;
    const o={passive:false};
    canvas.addEventListener('touchstart',e=>this._start(e),o);
    canvas.addEventListener('touchmove',e=>this._move(e),o);
    canvas.addEventListener('touchend',e=>this._end(e));
    canvas.addEventListener('touchcancel',e=>this._end(e));
  }
  _pos(t){ const r=this.cv.getBoundingClientRect(); return {x:(t.clientX-r.left)*(W/r.width),y:(t.clientY-r.top)*(H/r.height)}; }
  _hit(x,y){
    if(!this.visible) return null;
    for(const b of TOUCH_BTNS) if(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h) return b;
    return null;
  }
  _press(btn){
    this.pressed.add(btn.id);
    for(const k of btn.keys){ if(!this.inp.held.has(k)) this.inp.jp.add(k); this.inp.held.add(k); }
  }
  _release(id){
    this.pressed.delete(id);
    const btn=TOUCH_BTNS.find(b=>b.id===id); if(!btn) return;
    for(const k of btn.keys){
      let still=false; for(const [,bid] of this._map) if(bid===id){still=true;break;}
      if(!still) this.inp.held.delete(k);
    }
  }
  _start(e){
    e.preventDefault();
    for(const t of e.changedTouches){ const p=this._pos(t),b=this._hit(p.x,p.y); if(b){this._map.set(t.identifier,b.id);this._press(b);} }
  }
  _move(e){
    e.preventDefault();
    for(const t of e.changedTouches){
      const p=this._pos(t),b=this._hit(p.x,p.y);
      const prev=this._map.get(t.identifier),cur=b?b.id:null;
      if(prev!==cur){
        if(prev){this._map.delete(t.identifier);this._release(prev);}
        if(b){this._map.set(t.identifier,b.id);this._press(b);}
      }
    }
  }
  _end(e){ for(const t of e.changedTouches){ const prev=this._map.get(t.identifier); if(prev){this._map.delete(t.identifier);this._release(prev);} } }
  draw(ctx){
    if(!this.active||!this.visible) return;
    for(const b of TOUCH_BTNS){
      const pr=this.pressed.has(b.id), small=b.id==='pause';
      ctx.save();
      // Button background
      ctx.globalAlpha=pr?0.45:0.2; ctx.fillStyle='#39ff14';
      const rd=small?6:12;
      ctx.beginPath();
      ctx.moveTo(b.x+rd,b.y);
      ctx.lineTo(b.x+b.w-rd,b.y);
      ctx.quadraticCurveTo(b.x+b.w,b.y,b.x+b.w,b.y+rd);
      ctx.lineTo(b.x+b.w,b.y+b.h-rd);
      ctx.quadraticCurveTo(b.x+b.w,b.y+b.h,b.x+b.w-rd,b.y+b.h);
      ctx.lineTo(b.x+rd,b.y+b.h);
      ctx.quadraticCurveTo(b.x,b.y+b.h,b.x,b.y+b.h-rd);
      ctx.lineTo(b.x,b.y+rd);
      ctx.quadraticCurveTo(b.x,b.y,b.x+rd,b.y);
      ctx.closePath(); ctx.fill();
      // Border
      ctx.globalAlpha=pr?0.7:0.35; ctx.strokeStyle='#39ff14'; ctx.lineWidth=2; ctx.stroke();
      // Label
      ctx.globalAlpha=pr?0.85:0.5; ctx.fillStyle='#fff';
      ctx.font=small?"bold 14px 'Orbitron',sans-serif":"bold 28px 'Orbitron',sans-serif";
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(b.label,b.x+b.w/2,b.y+b.h/2);
      ctx.restore();
    }
  }
}

// ===================== LEVEL DATA =====================
const LEVELS = [
  { name:"FIRST CONTACT", atoms:[3], timer:20, acc:0.70,
    plats:[], windPow:0, lev:null },
  { name:"CONTAINMENT BREACH", atoms:[3,3], timer:30, acc:0.80,
    plats:[['h',180,350,200],['h',420,260,200]], windPow:1.5, lev:null },
  { name:"HALF LIFE", atoms:[3,3,2], timer:40, acc:0.80,
    plats:[['v',395,80,380]], windPow:0, lev:null },
  { name:"CHAIN REACTION", atoms:[3,3,2,'u'], timer:50, acc:0.90,
    plats:[['mh',80,380,150,0.8,130],['mh',350,280,150,-0.6,110],['mh',550,180,150,1.0,100]],
    windPow:2.0, lev:400 },
  { name:"CRITICAL MASS", atoms:[3,3], timer:60, acc:0.90,
    plats:[['v',200,100,260],['v',590,100,260],['h',250,350,300],['h',80,220,180]],
    windPow:1.5, lev:null },
  { name:"FLUX CAPACITY", atoms:[3,3,2], timer:70, acc:1.00,
    plats:[['mh',50,300,220,2.0,280]], windPow:2.0, lev:400 },
  { name:"ISOTOPE DECAY", atoms:[3,3,2,2,'u'], timer:80, acc:1.00,
    plats:[['h',80,360,130],['h',300,260,130],['h',520,360,130],['h',650,220,120],['mv',400,80,260,0.7,100]],
    windPow:0, lev:350 },
  { name:"REACTOR CORE", atoms:[3,3,3], timer:90, acc:1.10,
    plats:[['mh',50,360,160,1.0,180],['mh',400,220,160,-1.2,170],['mv',200,80,220,0.5,90],['mv',560,80,220,-0.8,110]],
    windPow:2.5, lev:400 },
  { name:"NEUTRON STORM", atoms:[4,3,3,2], timer:100, acc:1.10,
    plats:[['h',50,380,110],['h',200,280,110],['h',370,380,110],['h',520,280,110],['h',660,380,110],['v',160,180,220],['v',460,140,260]],
    windPow:1.5, lev:null },
  { name:"CENTRIFUGE", atoms:[3,3,3,2,2,'u'], timer:110, acc:1.20,
    plats:[['mh',50,310,170,1.8,220],['mh',350,190,170,-2.0,180],['mh',500,410,170,1.5,140],['v',260,70,320],['v',540,70,320]],
    windPow:2.0, lev:400 },
  { name:"DARK MATTER", atoms:[3,3,3,2,2,2], timer:120, acc:1.20,
    plats:[['mv',150,40,310,0.6,70],['mv',370,40,310,-0.8,90],['mv',570,40,310,0.5,80],['h',100,400,240],['h',450,300,240]],
    windPow:2.5, lev:350 },
  { name:"QUANTUM TUNNEL", atoms:[4,3,3,3], timer:130, acc:1.30,
    plats:[['mv',120,40,400,2.5,280],['h',280,360,160],['h',500,260,160]],
    windPow:2.0, lev:400 },
  { name:"PROTON COLLIDER", atoms:[3,3,3,3,2,2,'u'], timer:140, acc:1.30,
    plats:[['v',190,60,320],['v',360,120,280],['v',540,60,320],['h',190,370,170],['h',440,260,170],['h',80,210,120],['h',610,370,110]],
    windPow:2.0, lev:null },
  { name:"GAMMA BURST", atoms:[3,3,3,3,2,2,'u'], timer:150, acc:1.40,
    plats:[['mh',50,360,190,2.0,190],['mh',350,230,190,-2.5,170],['mh',500,400,180,1.8,140],['mv',200,60,260,2.0,120],['mv',560,60,260,-1.5,100]],
    windPow:1.5, lev:400 },
  { name:"FUSION CORE", atoms:[3,3,3,3,'u'], timer:160, acc:1.40,
    plats:[['v',140,40,420],['v',280,40,420],['v',420,40,420],['v',560,40,420],['v',680,40,420],['h',280,260,140],['h',560,360,120]],
    windPow:2.5, lev:null },
  { name:"ANTIMATTER", atoms:[4,3,3,3,3,2,'u'], timer:170, acc:1.50,
    plats:[['mh',0,310,200,1.5,140],['mh',300,310,200,1.5,140],['mh',100,190,200,-1.2,140],['mh',420,190,200,-1.2,140],['v',360,60,160]],
    windPow:2.0, lev:400 },
  { name:"SUPERCRITICAL", atoms:[3,3,3,3,3,2,2,'u'], timer:180, acc:1.50,
    plats:[['mh',50,370,130,1.0,110],['mh',250,270,130,-1.3,90],['mh',460,370,130,0.8,120],['mh',620,210,130,-1.5,100],['mv',200,40,260,0.7,90],['mv',420,80,220,-0.9,70],['mv',610,40,260,0.6,100]],
    windPow:2.0, lev:350 },
  { name:"SOLAR FLARE", atoms:[3,3,3,3,3,3,'u'], timer:190, acc:1.60,
    plats:[['mh',0,360,190,2.5,240],['mh',400,210,190,-3.0,190],['mv',160,40,310,2.0,140],['mv',460,40,310,-2.5,110],['mv',310,80,220,1.8,90]],
    windPow:3.0, lev:400 },
  { name:"EVENT HORIZON", atoms:[3,3,3,3,3,3,2,2,2], timer:200, acc:1.60,
    plats:[['v',210,40,360],['v',410,40,360],['v',610,40,360],['mh',100,290,150,1.5,110],['mh',420,370,150,-1.8,120],['mv',310,70,210,1.0,90],['mv',510,90,210,-1.2,80]],
    windPow:2.5, lev:350 },
  { name:"BIG BANG", atoms:[4,3,3,3,3,3,3,2,2,'u'], timer:210, acc:1.80,
    plats:[['mh',0,390,200,2.0,230],['mh',300,260,200,-2.5,190],['mh',520,160,200,1.8,170],['mv',160,40,360,1.5,120],['mv',360,60,310,-2.0,110],['mv',560,40,360,1.2,130],['h',220,450,160],['h',520,370,160]],
    windPow:3.0, lev:400 },
];

// ===================== PLATFORM =====================
class Platform {
  constructor(d){
    const t=d[0]; this.x=d[1]; this.y=d[2];
    if(t==='h'||t==='mh'){ this.w=d[3]; this.h=10; }
    else { this.w=10; this.h=d[3]; }
    this.moving = t==='mh'||t==='mv';
    this.axis = (t==='mh')?'x':'y';
    this.spd = d[4]||0; this.range = d[5]||0;
    this.ox=this.x; this.oy=this.y; this.ph=rr(0,TWO_PI);
  }
  update(tm,frozen){
    if(!this.moving||frozen) return;
    this.ph += this.spd * tm * 0.02;
    if(this.axis==='x') this.x = this.ox + Math.sin(this.ph)*this.range;
    else this.y = this.oy + Math.sin(this.ph)*this.range;
  }
  draw(ctx){
    ctx.save();
    ctx.fillStyle='#0c1520';
    ctx.fillRect(this.x,this.y,this.w,this.h);
    ctx.shadowColor='#39ff14'; ctx.shadowBlur=4;
    ctx.strokeStyle='rgba(57,255,20,0.5)'; ctx.lineWidth=1;
    ctx.strokeRect(this.x,this.y,this.w,this.h);
    ctx.shadowBlur=0; ctx.strokeStyle='rgba(57,255,20,0.15)';
    if(this.w>this.h){
      const cy=this.y+this.h/2;
      ctx.beginPath(); ctx.moveTo(this.x+3,cy); ctx.lineTo(this.x+this.w-3,cy); ctx.stroke();
    } else {
      const cx=this.x+this.w/2;
      ctx.beginPath(); ctx.moveTo(cx,this.y+3); ctx.lineTo(cx,this.y+this.h-3); ctx.stroke();
    }
    ctx.restore();
  }
}

// ===================== PLATFORM LEVER =====================
class PlatformLever {
  constructor(x){
    this.x=x; this.y=GROUND; this.active=false;
    this.dir=0; this.cool=0;
  }
  update(players,dtf){
    if(this.cool>0){ this.cool-=dtf; return; }
    for(const p of players){
      if(!p.alive) continue;
      const dx=p.x-this.x;
      if(Math.abs(dx)<24 && p.y>=GROUND-10){
        if(dx>4){
          this.dir=-1; this.active=!this.active; this.cool=30; sfx.click(); break;
        } else if(dx<-4){
          this.dir=1; this.active=!this.active; this.cool=30; sfx.click(); break;
        }
      }
    }
  }
  draw(ctx){
    ctx.save();
    const bx=this.x, by=this.y;
    ctx.fillStyle='#0c1520';
    ctx.fillRect(bx-16,by-6,32,6);
    ctx.strokeStyle=this.active?'#ff8833':'rgba(57,255,20,0.4)';
    ctx.lineWidth=1.5;
    ctx.strokeRect(bx-16,by-6,32,6);
    ctx.translate(bx,by-6);
    ctx.rotate(this.dir*0.7);
    ctx.fillStyle=this.active?'#ff8833':'#39ff14';
    ctx.shadowColor=this.active?'#ff8833':'#39ff14';
    ctx.shadowBlur=this.active?8:4;
    ctx.fillRect(-2,-26,4,26);
    ctx.beginPath(); ctx.arc(0,-26,5,0,TWO_PI); ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
    ctx.save();
    ctx.fillStyle=this.active?'rgba(255,136,51,0.7)':'rgba(57,255,20,0.4)';
    ctx.font="bold 8px 'Orbitron',sans-serif"; ctx.textAlign='center';
    ctx.fillText(this.active?T('■ LOCK'):T('▶ FREE'),bx,by-38);
    ctx.restore();
  }
}

// ===================== WIND STREAK =====================
class WindStreak {
  constructor(d){ this.reset(d); }
  reset(d){
    this.x=d>0?rr(-50,-10):rr(W+10,W+50);
    this.y=rr(20,GROUND-20);
    this.len=rr(12,35); this.spd=rr(2,5); this.a=rr(0.04,0.12);
  }
  update(d,s,tm){
    this.x+=d*this.spd*(s/0.3)*tm;
    if((d>0&&this.x>W+40)||(d<0&&this.x<-40)) this.reset(d);
  }
  draw(ctx,d){
    ctx.save(); ctx.globalAlpha=this.a; ctx.strokeStyle='#aaddff'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(this.x,this.y); ctx.lineTo(this.x+this.len*d,this.y); ctx.stroke();
    ctx.restore();
  }
}

// ===================== PLAYER =====================
class Player {
  constructor(id,sx,ctrl,th){
    this.id=id; this.sx=sx; this.ctrl=ctrl; this.th=th;
    this.lives=5; this.alive=true; this.harps=[]; this.jetRayH=null; this.reset();
  }
  reset(){
    this.x=this.sx; this.y=GROUND; this.w=P_W; this.h=P_H; this.inv=0;
    this.fx={timeSlow:0,splitBeam:0,persistentBeam:0,shield:0,overclock:0,tripleShot:0,jetpack:0};
    this.jetRayH=null;
  }
  fullReset(lives){
    this.lives=lives||5; this.alive=true; this.harps=[]; this.jetRayH=null; this.reset();
  }
  get maxH(){
    let m=this.fx.splitBeam>0?2:1;
    if(this.fx.tripleShot>0) m*=3;
    return m;
  }
  get harpsPerShot(){ return this.fx.tripleShot>0?3:1; }
  get spdM(){ return this.fx.overclock>0?2:1; }
  get hSpdM(){ return this.fx.overclock>0?2:1; }
  get shielded(){ return this.fx.shield>0; }
  get flying(){ return this.fx.jetpack>0; }
  applyPU(t){ this.fx[t.id]=t.dur; }
  activeFx(){
    const a=[];
    for(const t of PU_TYPES) if(t.dur>0&&this.fx[t.id]&&this.fx[t.id]>0) a.push({...t,rem:this.fx[t.id]});
    return a;
  }
  update(inp,tm,plats){
    if(!this.alive) return;
    const sp=P_SPEED*this.spdM*tm;
    const fly=this.flying;
    if(inp.any(this.ctrl.l)) this.x-=sp;
    if(inp.any(this.ctrl.r)) this.x+=sp;
    this.x=clamp(this.x,this.w/2,W-this.w/2);
    if(fly){
      if(inp.any(this.ctrl.u)) this.y-=sp;
      if(inp.any(this.ctrl.d)) this.y+=sp;
      this.y=clamp(this.y,P_H+10,GROUND);
      if(!this.jetRayH||!this.jetRayH.alive){
        this.jetRayH=new Harpoon(this.x,this.y,this.th.harp,this.th.hGlow,0,true,Math.PI);
        this.jetRayH.isJetRay=true;
        this.harps.push(this.jetRayH);
      }
      this.jetRayH.baseX=this.x; this.jetRayH.baseY=this.y;
      this.jetRayH.tipX=this.x; this.jetRayH.tipY=GROUND;
      for(const p of plats){
        if(this.x>=p.x&&this.x<=p.x+p.w&&p.y>this.y&&p.y<this.jetRayH.tipY){
          this.jetRayH.tipY=p.y;
        }
      }
    } else {
      if(this.y<GROUND) this.y=Math.min(this.y+6*tm,GROUND);
      // Kill ALL jet ray harpoons (not just the tracked ref) to prevent orphans
      for(const h of this.harps) if(h.isJetRay) h.alive=false;
      this.jetRayH=null;
      const activeH=this.harps.filter(h=>!h.isJetRay).length;
      if(inp.jany(this.ctrl.s)&&activeH+this.harpsPerShot<=this.maxH){
        const pers=this.fx.persistentBeam>0, hs=HARP_SPEED*this.hSpdM;
        if(this.fx.tripleShot>0){
          this.harps.push(new Harpoon(this.x,this.y,this.th.harp,this.th.hGlow,hs,pers,0));
          this.harps.push(new Harpoon(this.x,this.y,this.th.harp,this.th.hGlow,hs,pers,-Math.PI/4));
          this.harps.push(new Harpoon(this.x,this.y,this.th.harp,this.th.hGlow,hs,pers,Math.PI/4));
        } else {
          this.harps.push(new Harpoon(this.x,this.y,this.th.harp,this.th.hGlow,hs,pers,0));
        }
        sfx.shoot();
      }
    }
    if(this.inv>0) this.inv-=tm;
    for(const k in this.fx) if(this.fx[k]>0) this.fx[k]-=tm;
    for(const h of this.harps) if(!h.isJetRay) h.update(tm,plats);
    this.harps=this.harps.filter(h=>h.alive);
    if(this.jetRayH&&!this.jetRayH.alive) this.jetRayH=null;
  }
  draw(ctx,fr){
    if(!this.alive) return;
    if(this.inv>0&&!this.shielded&&Math.floor(this.inv/4)%2===0) return;
    const x=this.x, fy=this.y, t=this.th;
    ctx.save();
    if(this.shielded){
      const sa=0.15+0.08*Math.sin(fr*0.1);
      ctx.strokeStyle='#39ff14'; ctx.lineWidth=2; ctx.globalAlpha=sa+0.3;
      ctx.shadowColor='#39ff14'; ctx.shadowBlur=12;
      ctx.beginPath(); ctx.ellipse(x,fy-24,22,32,0,0,TWO_PI); ctx.stroke();
      ctx.globalAlpha=sa; ctx.fillStyle='rgba(57,255,20,0.05)'; ctx.fill();
      ctx.globalAlpha=1; ctx.shadowBlur=0;
    }
    if(this.fx.overclock>0){
      ctx.globalAlpha=0.12+0.06*Math.sin(fr*0.15);
      ctx.fillStyle='#ff8833'; ctx.shadowColor='#ff8833'; ctx.shadowBlur=16;
      ctx.beginPath(); ctx.ellipse(x,fy-22,18,28,0,0,TWO_PI); ctx.fill();
      ctx.globalAlpha=1; ctx.shadowBlur=0;
    }
    if(this.flying){
      ctx.save();
      ctx.globalAlpha=0.5+0.3*Math.sin(fr*0.5);
      const fLen=10+Math.sin(fr*0.7)*4;
      const fg=ctx.createLinearGradient(x,fy,x,fy+fLen+3);
      fg.addColorStop(0,'#ffaa33'); fg.addColorStop(0.6,'#ff4400'); fg.addColorStop(1,'transparent');
      ctx.fillStyle=fg; ctx.shadowColor='#ff4400'; ctx.shadowBlur=8;
      ctx.beginPath();
      ctx.moveTo(x-5,fy); ctx.lineTo(x+5,fy);
      ctx.lineTo(x+Math.sin(fr*0.8)*2,fy+fLen);
      ctx.lineTo(x+Math.sin(fr*0.8+2)*2,fy+fLen);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur=0; ctx.restore();
    }
    ctx.shadowColor=t.suit; ctx.shadowBlur=8;
    ctx.fillStyle=t.body; ctx.beginPath(); ctx.ellipse(x,fy-22,12,20,0,0,TWO_PI); ctx.fill();
    ctx.strokeStyle=t.suit; ctx.lineWidth=1; ctx.globalAlpha=0.5;
    ctx.beginPath(); ctx.ellipse(x,fy-22,13,21,0,0,TWO_PI); ctx.stroke(); ctx.globalAlpha=1;
    ctx.shadowBlur=0; ctx.fillStyle=t.acc;
    ctx.beginPath(); ctx.arc(x,fy-38,10,0,TWO_PI); ctx.fill();
    ctx.shadowColor=t.visor; ctx.shadowBlur=6; ctx.fillStyle=t.visor; ctx.globalAlpha=0.85;
    ctx.beginPath(); ctx.ellipse(x,fy-38,7,5,0,0,TWO_PI); ctx.fill();
    ctx.globalAlpha=1; ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.ellipse(x-2,fy-40,3,1.5,-0.3,0,TWO_PI); ctx.fill();
    ctx.strokeStyle=t.body; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(x-5,fy-4); ctx.lineTo(x-8,fy); ctx.moveTo(x+5,fy-4); ctx.lineTo(x+8,fy); ctx.stroke();
    ctx.fillStyle=t.suit; ctx.globalAlpha=0.6;
    ctx.fillRect(x-10,fy-2,5,2); ctx.fillRect(x+5,fy-2,5,2); ctx.globalAlpha=1;
    ctx.fillStyle='#555'; ctx.fillRect(x+9,fy-28,7,4);
    ctx.fillStyle=t.suit; ctx.fillRect(x+10,fy-27,5,2);
    ctx.shadowColor=t.suit; ctx.shadowBlur=4; ctx.fillStyle=t.suit;
    ctx.font="bold 10px 'Orbitron',sans-serif"; ctx.textAlign='center';
    ctx.fillText(T(t.lbl),x,fy-54); ctx.shadowBlur=0;
    ctx.restore();
  }
  bounds(){ return {x:this.x-this.w/2,y:this.y-this.h,w:this.w,h:this.h}; }
  hit(){
    if(this.shielded){ this.inv=30; sfx.hit(); return false; }
    this.lives--; this.inv=150;
    // Kill ALL harpoons (including jet ray) to avoid orphaned rays
    this.harps.forEach(h=>h.alive=false);
    this.harps=[];
    this.jetRayH=null;
    sfx.hit();
    if(this.lives<=0){ this.alive=false; }
    return true;
  }
}

// ===================== HARPOON =====================
class Harpoon {
  constructor(x,y,col,glow,spd,pers,ang){
    this.baseX=x; this.baseY=y; this.tipX=x; this.tipY=y;
    this.alive=true; this.col=col; this.glow=glow;
    this.spd=spd||HARP_SPEED; this.pers=pers||false;
    this.ang=ang||0;
    this.vx=Math.sin(this.ang)*this.spd;
    this.vy=-Math.cos(this.ang)*this.spd;
    this.isJetRay=false;
  }
  update(tm,plats){
    if(this.isJetRay) return;
    this.tipX+=this.vx*tm;
    this.tipY+=this.vy*tm;
    if(Math.abs(this.ang)<0.01){
      let blockY=null;
      for(const p of plats){
        if(this.tipX>=p.x&&this.tipX<=p.x+p.w){
          const pb=p.y+p.h;
          if(pb<this.baseY&&this.tipY<=pb){
            if(blockY===null||pb>blockY) blockY=pb;
          }
        }
      }
      if(blockY!==null){
        if(this.pers) this.tipY=blockY; else this.alive=false;
        return;
      }
    }
    if(this.tipY<=0){ if(this.pers) this.tipY=0; else this.alive=false; }
    else if(this.tipY>=GROUND){ if(this.pers) this.tipY=GROUND; else this.alive=false; }
    if(this.tipX<=0||this.tipX>=W) this.alive=false;
  }
  draw(ctx){
    ctx.save();
    ctx.strokeStyle=this.glow; ctx.lineWidth=this.isJetRay?10:(this.pers?8:6); ctx.globalAlpha=this.isJetRay?0.2:0.3;
    ctx.beginPath(); ctx.moveTo(this.baseX,this.baseY); ctx.lineTo(this.tipX,this.tipY); ctx.stroke();
    ctx.globalAlpha=1; ctx.strokeStyle=this.col; ctx.lineWidth=this.isJetRay?4:(this.pers?3:2);
    ctx.shadowColor=this.col; ctx.shadowBlur=this.isJetRay?16:(this.pers?14:10);
    ctx.beginPath(); ctx.moveTo(this.baseX,this.baseY); ctx.lineTo(this.tipX,this.tipY); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.shadowBlur=14;
    ctx.beginPath(); ctx.arc(this.tipX,this.tipY,this.isJetRay?5:(this.pers?4:3),0,TWO_PI); ctx.fill();
    ctx.shadowBlur=0; ctx.fillStyle=this.col; ctx.globalAlpha=0.6;
    const dx=this.tipX-this.baseX, dy=this.tipY-this.baseY;
    const cnt=this.isJetRay?7:(this.pers?5:3);
    for(let i=0;i<cnt;i++){
      const t=Math.random();
      ctx.beginPath(); ctx.arc(this.baseX+dx*t+rr(-3,3),this.baseY+dy*t,1.5,0,TWO_PI); ctx.fill();
    }
    ctx.restore();
  }
}

// ===================== ATOM =====================
class Atom {
  constructor(x,y,vx,vy,sz){
    this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.sz=sz;
    this.r=ATOM_DEFS[sz].r; this.alive=true; this.ph=rr(0,TWO_PI);
    this.oSpd = sz==='u' ? 0.02 : 0.03+(3-Math.min(sz,3))*0.01;
    this.boosted=false; this.spdFactor=1;
    this.unstable=false;
  }
  update(tm,wf,sm,plats){
    const t = tm * sm * ATOM_SPD * this.spdFactor;
    this.vy+=GRAVITY*t;
    this.x+=this.vx*t+wf*t;
    this.y+=this.vy*t;
    if(this.y+this.r>=GROUND){
      this.y=GROUND-this.r;
      this.vy=-(BOUNCE_VEL[this.sz]||4.5);
    }
    if(this.y-this.r<=0){ this.y=this.r; this.vy=Math.abs(this.vy)*BOUNCE; }
    if(this.x-this.r<=0){ this.x=this.r; this.vx=Math.abs(this.vx); }
    if(this.x+this.r>=W){ this.x=W-this.r; this.vx=-Math.abs(this.vx); }
    for(const p of plats) this.colPlat(p);
    this.ph+=this.oSpd*t;
  }
  colPlat(p){
    const cx=clamp(this.x,p.x,p.x+p.w), cy=clamp(this.y,p.y,p.y+p.h);
    const dx=this.x-cx, dy=this.y-cy, d2=dx*dx+dy*dy;
    if(d2>=this.r*this.r) return;
    if(d2<0.01){
      const tL=this.x-p.x,tR=p.x+p.w-this.x,tT=this.y-p.y,tB=p.y+p.h-this.y;
      const mn=Math.min(tL,tR,tT,tB);
      if(mn===tT){this.y=p.y-this.r;this.vy=-Math.abs(this.vy)*BOUNCE;}
      else if(mn===tB){this.y=p.y+p.h+this.r;this.vy=Math.abs(this.vy)*BOUNCE;}
      else if(mn===tL){this.x=p.x-this.r;this.vx=-Math.abs(this.vx);}
      else{this.x=p.x+p.w+this.r;this.vx=Math.abs(this.vx);}
      return;
    }
    const d=Math.sqrt(d2),nx=dx/d,ny=dy/d;
    this.x=cx+nx*this.r; this.y=cy+ny*this.r;
    const dot=this.vx*nx+this.vy*ny;
    if(dot<0){ this.vx-=(1+BOUNCE)*dot*nx; this.vy-=(1+BOUNCE)*dot*ny; }
  }
  draw(ctx){
    const def=ATOM_DEFS[this.sz],col=ATOM_COL[this.sz];
    const r=this.r,nR=def.nR,orb=def.orb,nE=def.nE;
    const isU=this.sz==='u';
    ctx.save(); ctx.translate(this.x,this.y);
    // Outer glow
    ctx.fillStyle=col.ou; ctx.beginPath(); ctx.arc(0,0,r+4,0,TWO_PI); ctx.fill();
    if(this.boosted){
      ctx.fillStyle='rgba(255,60,20,0.08)'; ctx.beginPath(); ctx.arc(0,0,r+8,0,TWO_PI); ctx.fill();
    }
    // Uranium pulsing aura + purple rim
    if(isU){
      const pulse=0.08+0.05*Math.sin(this.ph*2);
      ctx.fillStyle=`rgba(100,0,200,${pulse})`;
      ctx.beginPath(); ctx.arc(0,0,r+10,0,TWO_PI); ctx.fill();
      ctx.strokeStyle=`rgba(150,0,255,${0.3+0.15*Math.sin(this.ph*3)})`;
      ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(0,0,r,0,TWO_PI); ctx.stroke();
    }
    // Unstable atom glow + trefoil ☢
    if(this.unstable){
      const upulse=0.06+0.04*Math.sin(this.ph*3);
      ctx.fillStyle=`rgba(255,200,0,${upulse})`;
      ctx.beginPath(); ctx.arc(0,0,r+8,0,TWO_PI); ctx.fill();
      ctx.strokeStyle=`rgba(255,200,0,${0.25+0.15*Math.sin(this.ph*4)})`;
      ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(0,0,r+2,0,TWO_PI); ctx.stroke();
    }
    // Orbital ellipses
    ctx.strokeStyle=this.unstable?'rgba(255,200,0,0.3)':col.o;
    ctx.lineWidth=1;
    for(let i=0;i<orb;i++){
      ctx.save();
      ctx.rotate((Math.PI/orb)*i+this.ph*0.3);
      ctx.beginPath(); ctx.ellipse(0,0,r*0.85,r*0.4,0,0,TWO_PI); ctx.stroke();
      ctx.restore();
    }
    // Nucleus center glow
    ctx.shadowColor=this.boosted?'#ff4422':(this.unstable?'#ffcc00':col.c);
    ctx.shadowBlur=12;
    const ng=ctx.createRadialGradient(0,0,0,0,0,nR);
    ng.addColorStop(0,'#fff');
    ng.addColorStop(0.3,this.boosted?'#ff6633':(isU?'#39ff14':col.c));
    ng.addColorStop(1,col.g);
    ctx.fillStyle=ng; ctx.beginPath(); ctx.arc(0,0,nR,0,TWO_PI); ctx.fill();
    ctx.shadowBlur=0;
    // Element symbol (sized to fill nucleus, with dark outline for readability)
    const fontSize=clamp(nR*0.9,8,24);
    ctx.font=`bold ${fontSize}px 'Orbitron',sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    // Dark stroke behind text for contrast
    ctx.strokeStyle='rgba(0,0,0,0.7)';
    ctx.lineWidth=3;
    ctx.lineJoin='round';
    ctx.strokeText(def.sym,0,1);
    ctx.fillStyle=isU?'rgba(255,255,255,0.95)':(this.unstable?'rgba(255,230,100,0.9)':'rgba(255,255,255,0.95)');
    ctx.fillText(def.sym,0,1);
    // Unstable atom trefoil icon above
    if(this.unstable){
      const tSz=clamp(r*0.28,10,18);
      ctx.fillStyle=`rgba(255,200,0,${0.6+0.3*Math.sin(this.ph*3)})`;
      ctx.font=`${tSz}px sans-serif`;
      ctx.fillText('☢',0,-r-tSz*0.5-2);
    }
    // Electrons on orbits (clean dots only)
    ctx.shadowColor=col.e; ctx.shadowBlur=4;
    const ePerOrb=[];
    for(let i=0;i<orb;i++) ePerOrb.push(0);
    for(let e=0;e<nE;e++) ePerOrb[e%orb]++;
    for(let i=0;i<orb;i++){
      const oa=(Math.PI/orb)*i+this.ph*0.3;
      const ca=Math.cos(oa),sa=Math.sin(oa);
      const cnt=ePerOrb[i];
      for(let j=0;j<cnt;j++){
        const ea=this.ph*(1.5+i*0.7)+(TWO_PI/cnt)*j;
        const ex=Math.cos(ea)*r*0.85, ey=Math.sin(ea)*r*0.4;
        const px=ex*ca-ey*sa, py=ex*sa+ey*ca;
        const eRad=r>=50?3.5:(r>=25?3:2.5);
        ctx.fillStyle=this.unstable?'#ffcc44':col.e;
        ctx.beginPath(); ctx.arc(px,py,eRad,0,TWO_PI); ctx.fill();
      }
    }
    ctx.restore();
  }
  split(){
    this.alive=false;
    // Uranium fission: 10 Neon (size 2) atoms burst out
    if(this.sz==='u'){
      const ch=[];
      for(let i=0;i<10;i++){
        const ang=(TWO_PI/10)*i+rr(-0.3,0.3);
        const spd=rr(1.5,3);
        ch.push(new Atom(
          this.x+Math.cos(ang)*14, this.y+Math.sin(ang)*14,
          Math.cos(ang)*spd, Math.sin(ang)*spd-rr(1,3), 2
        ));
      }
      return ch;
    }
    if(this.sz<=0) return [];
    const ns=this.sz-1, nr=ATOM_DEFS[ns].r;
    const sv=1.5+(4-ns)*0.5, cv=-Math.abs(this.vy)*0.5-2;
    // Unstable: splits into 4 (all children also unstable)
    if(this.unstable){
      const ch=[
        new Atom(this.x-nr*1.5,this.y,-sv-0.5+rr(-0.3,0.3),cv+rr(-0.5,0.5),ns),
        new Atom(this.x-nr*0.4,this.y,-sv*0.3+rr(-0.3,0.3),cv-1+rr(-0.5,0.5),ns),
        new Atom(this.x+nr*0.4,this.y, sv*0.3+rr(-0.3,0.3),cv-1+rr(-0.5,0.5),ns),
        new Atom(this.x+nr*1.5,this.y, sv+0.5+rr(-0.3,0.3),cv+rr(-0.5,0.5),ns),
      ];
      ch.forEach(c=>c.unstable=true);
      return ch;
    }
    return [
      new Atom(this.x-nr,this.y,-sv+rr(-0.5,0.5),cv+rr(-0.5,0.5),ns),
      new Atom(this.x+nr,this.y, sv+rr(-0.5,0.5),cv+rr(-0.5,0.5),ns),
    ];
  }
  hitsHarp(h){
    const dx=h.tipX-h.baseX, dy=h.tipY-h.baseY;
    const len2=dx*dx+dy*dy;
    if(len2<0.01) return dist(this.x,this.y,h.baseX,h.baseY)<=this.r;
    let t=((this.x-h.baseX)*dx+(this.y-h.baseY)*dy)/len2;
    t=clamp(t,0,1);
    const px=h.baseX+t*dx, py=h.baseY+t*dy;
    return dist(this.x,this.y,px,py)<=this.r;
  }
  hitsR(rc){
    const cx=clamp(this.x,rc.x,rc.x+rc.w),cy=clamp(this.y,rc.y,rc.y+rc.h);
    return dist(this.x,this.y,cx,cy)<=this.r;
  }
}

// ===================== ISOTOPE CANISTER (POWER-UP) =====================
class Canister {
  constructor(x,type){
    this.x=x; this.y=-20; this.type=type; this.r=PU_R; this.alive=true; this.ph=rr(0,TWO_PI); this.vy=1.2;
  }
  update(tm){ this.y+=this.vy*tm; this.ph+=0.04*tm; if(this.y-this.r>=GROUND) this.alive=false; }
  draw(ctx){
    const r=this.r,col=this.type.col,pu=0.7+0.3*Math.sin(this.ph*3);
    ctx.save(); ctx.translate(this.x,this.y);
    ctx.shadowColor=col; ctx.shadowBlur=14*pu; ctx.globalAlpha=0.15*pu;
    ctx.fillStyle=col; ctx.beginPath(); ctx.arc(0,0,r+6,0,TWO_PI); ctx.fill();
    ctx.globalAlpha=1; ctx.shadowBlur=8; ctx.fillStyle='#0a0e14'; ctx.strokeStyle=col; ctx.lineWidth=1.5;
    ctx.beginPath();
    for(let i=0;i<6;i++){const a=(TWO_PI/6)*i-Math.PI/6;if(i===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha=0.15*pu; ctx.fillStyle=col; ctx.fill(); ctx.globalAlpha=1;
    ctx.shadowBlur=6; ctx.fillStyle=col;
    ctx.font="bold 14px 'Orbitron',sans-serif"; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(this.type.ic,0,0);
    ctx.shadowBlur=0; ctx.strokeStyle=col; ctx.lineWidth=1; ctx.globalAlpha=0.35;
    ctx.beginPath(); ctx.ellipse(0,0,r+3,r*0.4,this.ph,0,TWO_PI); ctx.stroke();
    ctx.restore();
  }
  hitsR(rc){
    const cx=clamp(this.x,rc.x,rc.x+rc.w),cy=clamp(this.y,rc.y,rc.y+rc.h);
    return dist(this.x,this.y,cx,cy)<=this.r;
  }
}

// ===================== EFFECTS =====================
class Spark {
  constructor(x,y,col){
    this.x=x;this.y=y;const a=rr(0,TWO_PI),s=rr(1,5);
    this.vx=Math.cos(a)*s;this.vy=Math.sin(a)*s;
    this.life=25+ri(0,25);this.ml=this.life;this.r=rr(1.5,4);this.col=col;
  }
  update(dtf){this.vy+=0.05*dtf;this.x+=this.vx*dtf;this.y+=this.vy*dtf;this.vx*=Math.pow(0.98,dtf);this.life-=dtf;}
  draw(ctx){
    const t=this.life/this.ml;ctx.save();ctx.globalAlpha=t;ctx.shadowColor=this.col;ctx.shadowBlur=6;
    ctx.fillStyle=this.col;ctx.beginPath();ctx.arc(this.x,this.y,this.r*t,0,TWO_PI);ctx.fill();ctx.restore();
  }
}
class Ring {
  constructor(x,y,col,mr){this.x=x;this.y=y;this.col=col;this.r=0;this.mr=mr;this.life=20;this.ml=20;}
  update(dtf){this.r+=(this.mr-this.r)*Math.min(0.15*dtf,1);this.life-=dtf;}
  draw(ctx){
    const t=this.life/this.ml;ctx.save();ctx.globalAlpha=t*0.5;ctx.strokeStyle=this.col;ctx.lineWidth=2*t;
    ctx.shadowColor=this.col;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,TWO_PI);ctx.stroke();ctx.restore();
  }
}
class PUFlash {
  constructor(x,y,col,lbl){this.x=x;this.y=y;this.col=col;this.lbl=lbl;this.life=60;this.ml=60;this.rr=0;}
  update(dtf){this.y-=0.8*dtf;this.rr+=2*dtf;this.life-=dtf;}
  draw(ctx){
    const t=this.life/this.ml;ctx.save();ctx.globalAlpha=t;
    ctx.strokeStyle=this.col;ctx.lineWidth=2*t;ctx.shadowColor=this.col;ctx.shadowBlur=8;
    ctx.beginPath();ctx.arc(this.x,this.y+10,this.rr,0,TWO_PI);ctx.stroke();
    ctx.shadowBlur=6;ctx.fillStyle=this.col;ctx.font="bold 13px 'Orbitron',sans-serif";ctx.textAlign='center';
    ctx.fillText(this.lbl,this.x,this.y);ctx.restore();
  }
}
class FText {
  constructor(x,y,t,c){this.x=x;this.y=y;this.t=t;this.c=c;this.life=50;this.ml=50;}
  update(dtf){this.y-=1.2*dtf;this.life-=dtf;}
  draw(ctx){
    const t=this.life/this.ml;ctx.save();ctx.globalAlpha=t;ctx.shadowColor=this.c;ctx.shadowBlur=6;
    ctx.fillStyle=this.c;ctx.font="bold 16px 'Orbitron',sans-serif";ctx.textAlign='center';
    ctx.fillText(this.t,this.x,this.y);ctx.restore();
  }
}
class Star {
  constructor(){this.x=rr(0,W);this.y=rr(0,GROUND-20);this.r=rr(0.3,1.8);this.ts=rr(0.01,0.03);this.ph=rr(0,TWO_PI);
    this.col=["#fff","#ccddff","#ffeedd","#ddffcc","#ffddff"][ri(0,4)];}
  draw(ctx,fr){ctx.save();ctx.globalAlpha=0.25+0.4*Math.sin(fr*this.ts+this.ph);ctx.fillStyle=this.col;
    ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,TWO_PI);ctx.fill();ctx.restore();}
}
class Nebula {
  constructor(){this.x=rr(50,W-50);this.y=rr(40,GROUND-80);this.r=rr(60,150);
    this.col=["rgba(57,255,20,0.012)","rgba(0,212,255,0.012)","rgba(191,95,255,0.012)","rgba(255,247,0,0.008)"][ri(0,3)];}
  draw(ctx){const g=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.r);
    g.addColorStop(0,this.col);g.addColorStop(1,'transparent');ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,TWO_PI);ctx.fill();}
}

// ===================== MAIN GAME =====================
class Game {
  constructor(){
    this.cv=document.getElementById('gameCanvas');
    this.ctx=this.cv.getContext('2d');
    this.inp=new Input();
    this.mx=0;this.my=0;this.mc=false;
    this.cv.addEventListener('mousemove',e=>{const r=this.cv.getBoundingClientRect();this.mx=(e.clientX-r.left)*(W/r.width);this.my=(e.clientY-r.top)*(H/r.height);});
    this.cv.addEventListener('click',e=>{const r=this.cv.getBoundingClientRect();this.mx=(e.clientX-r.left)*(W/r.width);this.my=(e.clientY-r.top)*(H/r.height);this.mc=true;});
    // Touch-to-click for menus (works alongside TouchControls for gameplay)
    this.cv.addEventListener('touchstart',e=>{
      if(e.changedTouches.length>0){
        const t=e.changedTouches[0],r=this.cv.getBoundingClientRect();
        this.mx=(t.clientX-r.left)*(W/r.width); this.my=(t.clientY-r.top)*(H/r.height); this.mc=true;
      }
    },{passive:false});
    this.touch=new TouchControls(this.cv,this.inp);
    this.state='menu'; this.stTimer=0; this.frame=0; this.lastTime=0; this.dtf=1;
    this.numP=2; this.gameMode='normal';
    this.players=[]; this.atoms=[]; this.plats=[]; this.lever=null;
    this.pups=[]; this.sparks=[]; this.rings=[]; this.flashes=[]; this.ftexts=[];
    this.stars=[]; this.nebulae=[]; this.wStreaks=[];
    this.score=0; this.lvl=0; this.lvlTimer=0; this.accelDone=false;
    this.windPow=0; this.windActive=false; this.windGustDir=0;
    this.windGustTimer=0; this.windCalmTimer=0;
    this.puTimer=ri(PU_SPAWN_MIN,PU_SPAWN_MAX);
    this.menuSel=0; this.pauseSel=0;
    this.adPlaying=false; this._soundBeforeAd=true;
    this.rewardedOffered=false; // one rewarded-video offer per game over
    this.unlockedLvl=0;
    try { this.unlockedLvl=parseInt(CG.getItem('atoms_unlocked')||'0')||0; } catch(e){}
    try { const s=CG.getItem('sound_on'); if(s!==null) sfx.on=s!=='0'; } catch(e){}
    this.lsCursor=0;
    // Encyclopedia
    this.encPage=0;
    this.encPages=3; // 0=elements, 1=power-ups, 2=how to play
    // Unstable atom cycling
    this.unstableActive=false;
    this.unstableTimer=0;
    for(let i=0;i<100;i++) this.stars.push(new Star());
    for(let i=0;i<5;i++) this.nebulae.push(new Nebula());
    for(let i=0;i<25;i++) this.wStreaks.push(new WindStreak(1));
    // CrazyGames muteAudio setting
    sfx.cgMuted = CG.muteAudio;
    CG.addSettingsChangeListener((settings) => {
      if (settings.muteAudio !== undefined) sfx.cgMuted = settings.muteAudio;
    });
    this.loop=this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  btn(x,y,w,h){ return this.mx>=x&&this.mx<=x+w&&this.my>=y&&this.my<=y+h; }
  get atomSM(){ return 1; }
  get timeMul(){ for(const p of this.players) if(p.alive&&p.fx.timeSlow>0) return 0.4; return 1; }

  livesForLevel(idx){
    // Levels 10-20 (index 9-19): 7 lives
    // Levels 1-9 (index 0-8): 5 lives
    if(idx>=9) return 7;
    return 5;
  }
  /** Load saved progress from Yandex cloud (overrides localStorage) */
  async loadProgress(){
    const d=await YG.loadData();
    if(d){
      if(d.atoms_unlocked!==undefined) this.unlockedLvl=parseInt(d.atoms_unlocked)||0;
      if(d.sound_on!==undefined) sfx.on=d.sound_on!=='0';
    }
  }
  /** Save progress to both localStorage/CG and Yandex cloud */
  saveProgress(){
    CG.setItem('atoms_unlocked',String(this.unlockedLvl));
    CG.setItem('sound_on',sfx.on?'1':'0');
    YG.saveData({atoms_unlocked:this.unlockedLvl,sound_on:sfx.on?'1':'0'});
  }
  initPlayers(lvlIdx){
    this.players=[];
    const lv=this.livesForLevel(lvlIdx||0);
    this.players.push(new Player(0,W*0.3,CTRL[0],THEME[0]));
    this.players[0].fullReset(lv);
    if(this.numP===2){
      this.players.push(new Player(1,W*0.7,CTRL[1],THEME[1]));
      this.players[1].fullReset(lv);
    }
  }
  startLevel(idx){
    const lv=LEVELS[idx]; this.lvl=idx;
    this.atoms=[];
    const sizes=lv.atoms, n=sizes.length, maxRow=7;
    for(let i=0;i<n;i++){
      const row=Math.floor(i/maxRow),col=i%maxRow,pr=Math.min(maxRow,n-row*maxRow);
      const xf=(col+1)/(pr+1);
      const atomR=ATOM_DEFS[sizes[i]].r;
      const spawnY=Math.max(atomR+10,50+row*70)+rr(0,20);
      this.atoms.push(new Atom(W*xf+rr(-10,10),spawnY,rr(-0.8,0.8),0,sizes[i]));
    }
    this.plats=lv.plats.map(d=>new Platform(d));
    this.lever=lv.lev!=null?new PlatformLever(lv.lev):null;
    this.windPow=lv.windPow||0;
    this.windActive=false; this.windGustDir=0;
    this.windGustTimer=0;
    this.windCalmTimer=this.windPow>0?ri(WIND_CALM_MIN,WIND_CALM_MAX):0;
    this.lvlTimer=lv.timer*FPS; this.accelDone=false;
    if(this.gameMode==='hardcore'){
      // Revive dead players at the start of each new level
      for(const p of this.players){
        if(!p.alive){ p.alive=true; p.lives=1; }
      }
      // Bonus life every 5 levels
      if(idx>0 && idx%5===0){
        for(const p of this.players) p.lives=Math.min(p.lives+1,9);
      }
      // Ensure minimum lives for higher level brackets
      const minLives=this.livesForLevel(idx);
      for(const p of this.players){ if(p.lives<minLives) p.lives=minLives; }
    }
    for(const p of this.players){
      if(p.alive){
        p.x=p.sx; p.y=GROUND; p.harps=[]; p.jetRayH=null; p.inv=0;
        p.fx={timeSlow:0,splitBeam:0,persistentBeam:0,shield:0,overclock:0,tripleShot:0,jetpack:0};
      }
    }
    this.pups=[]; this.sparks=[]; this.rings=[]; this.flashes=[]; this.ftexts=[];
    this.puTimer=ri(PU_SPAWN_MIN,PU_SPAWN_MAX);
    // Reset unstable state (active from level 4+, i.e. index >= 3)
    this.unstableActive=false;
    this.unstableTimer=idx>=3?ri(5*FPS,15*FPS):0;
    for(const a of this.atoms) a.unstable=false;
  }

  loop(ts){
    if(!this.lastTime) this.lastTime=ts;
    const dt=Math.min((ts-this.lastTime)/1000,0.05);
    this.lastTime=ts;
    this.dtf=dt*FPS;
    this.update();
    this.draw();
    this.inp.end(); this.mc=false; this.frame+=this.dtf;
    requestAnimationFrame(this.loop);
  }

  update(){
    if(this.adPlaying) return;
    switch(this.state){
      case 'menu': this.uMenu(); break;
      case 'encyclopedia': this.uEncyclopedia(); break;
      case 'levelSelect': this.uLevelSelect(); break;
      case 'levelIntro': this.uIntro(); break;
      case 'playing': this.uPlay(); break;
      case 'paused': this.uPause(); break;
      case 'levelComplete': this.uLvlDone(); break;
      case 'gameOver': this.uEnd(); break;
      case 'victory': this.uEnd(); break;
    }
  }
  uMenu(){
    const N=5;
    if(this.inp.jp.has('ArrowUp')||this.inp.jp.has('KeyW')) this.menuSel=(this.menuSel+N-1)%N;
    if(this.inp.jp.has('ArrowDown')||this.inp.jp.has('KeyS')) this.menuSel=(this.menuSel+1)%N;
    if(this.inp.jp.has('ArrowLeft')||this.inp.jp.has('ArrowRight')||this.inp.jp.has('KeyA')||this.inp.jp.has('KeyD')){
      if(this.menuSel===0) this.numP=this.numP===1?2:1;
      if(this.menuSel===1) this.gameMode=this.gameMode==='normal'?'hardcore':'normal';
      if(this.menuSel===2){ sfx.on=!sfx.on; this.saveProgress(); }
    }
    if(this.inp.jp.has('Enter')||this.inp.jp.has('Space')){
      if(this.menuSel===0) this.numP=this.numP===1?2:1;
      else if(this.menuSel===1) this.gameMode=this.gameMode==='normal'?'hardcore':'normal';
      else if(this.menuSel===2){ sfx.on=!sfx.on; this.saveProgress(); }
      else if(this.menuSel===3){ this.encPage=0; this.state='encyclopedia'; sfx.click(); }
      else this.startFromMenu();
    }
    if(this.mc){
      if(this.btn(250,240,300,40)){ this.numP=this.numP===1?2:1; sfx.click(); }
      else if(this.btn(250,290,300,40)){ this.gameMode=this.gameMode==='normal'?'hardcore':'normal'; sfx.click(); }
      else if(this.btn(250,340,300,40)){ sfx.on=!sfx.on; this.saveProgress(); sfx.click(); }
      else if(this.btn(250,390,300,40)){ this.encPage=0; this.state='encyclopedia'; sfx.click(); }
      else if(this.btn(250,450,300,50)){ this.startFromMenu(); }
    }
  }
  startFromMenu(){
    sfx.init(); sfx.click();
    this.score=0;
    if(this.gameMode==='hardcore'){
      this.initPlayers(0);
      this.startLevel(0);
      this.state='levelIntro'; this.stTimer=3*FPS;
    } else {
      this.lsCursor=Math.min(this.unlockedLvl, LEVELS.length-1);
      this.state='levelSelect';
    }
  }
  uEncyclopedia(){
    if(this.inp.jp.has('Escape')||this.inp.jp.has('KeyQ')){
      this.state='menu'; sfx.click(); return;
    }
    if(this.inp.jp.has('ArrowRight')||this.inp.jp.has('KeyD')){
      this.encPage=Math.min(this.encPage+1,this.encPages-1); sfx.click();
    }
    if(this.inp.jp.has('ArrowLeft')||this.inp.jp.has('KeyA')){
      this.encPage=Math.max(this.encPage-1,0); sfx.click();
    }
    if(this.mc){
      // Tab clicks
      const tabW=200, tabY=55, tabH=30;
      for(let i=0;i<this.encPages;i++){
        const tx=W/2-this.encPages*tabW/2+i*tabW;
        if(this.btn(tx,tabY,tabW,tabH)){ this.encPage=i; sfx.click(); return; }
      }
      if(this.btn(300,560,200,30)){ this.state='menu'; sfx.click(); }
    }
  }
  uLevelSelect(){
    const maxUnlocked = Math.min(this.unlockedLvl, LEVELS.length-1);
    if(this.inp.jp.has('ArrowRight')||this.inp.jp.has('KeyD'))
      this.lsCursor=Math.min(this.lsCursor+1, maxUnlocked);
    if(this.inp.jp.has('ArrowLeft')||this.inp.jp.has('KeyA'))
      this.lsCursor=Math.max(this.lsCursor-1, 0);
    if(this.inp.jp.has('ArrowDown')||this.inp.jp.has('KeyS')){
      const next=this.lsCursor+5;
      if(next<=maxUnlocked) this.lsCursor=next;
    }
    if(this.inp.jp.has('ArrowUp')||this.inp.jp.has('KeyW')){
      const prev=this.lsCursor-5;
      if(prev>=0) this.lsCursor=prev;
    }
    if(this.inp.jp.has('Enter')||this.inp.jp.has('Space')){
      if(this.lsCursor<=maxUnlocked) this.launchLevel(this.lsCursor);
    }
    if(this.inp.jp.has('Escape')){
      this.state='menu'; sfx.click();
    }
    if(this.mc){
      if(this.btn(300,535,200,40)){
        this.state='menu'; sfx.click(); return;
      }
      for(let i=0;i<LEVELS.length;i++){
        const col=i%5, row=Math.floor(i/5);
        const cx=30+col*154, cy=100+row*95;
        if(this.btn(cx,cy,145,85)&&i<=maxUnlocked){
          this.lsCursor=i;
          this.launchLevel(i);
          return;
        }
      }
    }
  }
  launchLevel(idx){
    sfx.click();
    this.initPlayers(idx);
    this.startLevel(idx);
    this.state='levelIntro'; this.stTimer=3*FPS;
  }
  uIntro(){
    this.stTimer-=this.dtf;
    if(this.stTimer<=0){ this.state='playing'; this.lastTime=0; CG.gameplayStart(); YG.gameplayStart(); }
  }
  uPause(){
    const N=3;
    if(this.inp.jp.has('KeyP')||this.inp.jp.has('Escape')){
      this.state='playing'; CG.gameplayStart(); YG.gameplayStart(); sfx.click(); return;
    }
    if(this.inp.jp.has('ArrowUp')||this.inp.jp.has('KeyW')) this.pauseSel=(this.pauseSel+N-1)%N;
    if(this.inp.jp.has('ArrowDown')||this.inp.jp.has('KeyS')) this.pauseSel=(this.pauseSel+1)%N;
    if(this.inp.jp.has('Enter')||this.inp.jp.has('Space')){
      this.doPauseAction(this.pauseSel);
    }
    if(this.mc){
      const cx=W/2;
      for(let i=0;i<N;i++){
        if(this.btn(cx-130,280+i*55,260,42)){
          this.doPauseAction(i); return;
        }
      }
    }
  }
  doPauseAction(sel){
    sfx.click();
    if(sel===0){ this.state='playing'; CG.gameplayStart(); YG.gameplayStart(); }
    else if(sel===1){
      this.lsCursor=Math.min(this.lvl, Math.min(this.unlockedLvl, LEVELS.length-1));
      this.state='levelSelect';
    }
    else if(sel===2){ this.state='menu'; }
  }
  uPlay(){
    // Pause (P or Escape)
    if(this.inp.jp.has('KeyP')||this.inp.jp.has('Escape')){
      CG.gameplayStop(); YG.gameplayStop();
      this.state='paused'; this.pauseSel=0; this.lastTime=0; sfx.click(); return;
    }
    const dtf=this.dtf, tm=this.timeMul;
    // Players always move at full speed; time dilation only affects world
    for(const p of this.players) p.update(this.inp,dtf,this.plats);
    // Wind
    if(this.windPow>0){
      if(this.windActive){
        this.windGustTimer-=dtf*tm;
        if(this.windGustTimer<=0){
          this.windActive=false;
          this.windCalmTimer=ri(WIND_CALM_MIN,WIND_CALM_MAX);
        }
      } else {
        this.windCalmTimer-=dtf*tm;
        if(this.windCalmTimer<=0){
          this.windActive=true;
          this.windGustDir=Math.random()<0.5?-1:1;
          this.windGustTimer=ri(WIND_GUST_MIN,WIND_GUST_MAX);
        }
      }
    }
    const wf=this.windActive?this.windPow*this.windGustDir:0;
    // Lever
    if(this.lever) this.lever.update(this.players,dtf);
    const platFrozen=this.lever&&this.lever.active;
    // Atoms
    const sm=this.atomSM;
    for(const a of this.atoms) a.update(dtf*tm,wf,sm,this.plats);
    // Platforms
    for(const p of this.plats) p.update(dtf*tm,platFrozen);
    // Wind streaks
    if(this.windActive&&this.windPow>0){
      for(const ws of this.wStreaks) ws.update(this.windGustDir,this.windPow,dtf*tm);
    }
    // Unstable atom cycling (level 4+, i.e. index >= 3)
    if(this.lvl>=3){
      this.unstableTimer-=dtf;
      if(this.unstableTimer<=0){
        if(this.unstableActive){
          for(const a of this.atoms) a.unstable=false;
          this.unstableActive=false;
          this.unstableTimer=ri(5*FPS,20*FPS);
        } else {
          const candidates=this.atoms.filter(a=>a.alive&&a.sz!=='u'&&typeof a.sz==='number'&&a.sz>0);
          if(candidates.length>0){
            candidates[ri(0,candidates.length-1)].unstable=true;
            this.unstableActive=true;
            this.unstableTimer=ri(5*FPS,20*FPS);
            sfx.unstable();
          } else {
            this.unstableTimer=ri(2*FPS,5*FPS);
          }
        }
      }
      if(this.unstableActive&&!this.atoms.some(a=>a.alive&&a.unstable)){
        const candidates=this.atoms.filter(a=>a.alive&&a.sz!=='u'&&typeof a.sz==='number'&&a.sz>0);
        if(candidates.length>0){
          candidates[ri(0,candidates.length-1)].unstable=true;
        } else {
          this.unstableActive=false;
        }
      }
    }
    // Timer
    if(!this.accelDone){
      const prevTimer=this.lvlTimer;
      this.lvlTimer-=dtf*tm;
      if(prevTimer>FPS&&this.lvlTimer<=FPS) sfx.tick();
      if(this.lvlTimer<=0){
        this.accelDone=true;
        const boost=1+LEVELS[this.lvl].acc;
        for(const a of this.atoms){
          a.boosted=true; a.spdFactor=boost;
        }
      }
    }
    // Harpoon ↔ atom
    for(const pl of this.players){
      if(!pl.alive) continue;
      for(const h of pl.harps){
        if(!h.alive) continue;
        for(const a of this.atoms){
          if(!a.alive) continue;
          if(a.hitsHarp(h)){
            const isU=a.sz==='u';
            if(isU){
              this.score=Math.max(0,this.score-500);
              this.ftexts.push(new FText(a.x,a.y-a.r,'-500 ☢','#ff2222'));
              for(let i=0;i<20;i++) this.sparks.push(new Spark(a.x,a.y,'#39ff14'));
              for(let i=0;i<10;i++) this.sparks.push(new Spark(a.x,a.y,'#bf00ff'));
              this.rings.push(new Ring(a.x,a.y,'#39ff14',a.r*3));
              this.rings.push(new Ring(a.x,a.y,'#bf00ff',a.r*2));
              sfx.fission();
            } else {
              const pts=ATOM_DEFS[a.sz].pts; this.score+=pts;
              const uTxt=a.unstable?' ☢×4':'';
              this.ftexts.push(new FText(a.x,a.y-a.r,`+${pts}${uTxt}`,a.unstable?'#ffcc00':ATOM_COL[a.sz].c));
              this.spawnFx(a);
              sfx.pop(Math.min(a.sz,3));
            }
            const ch=a.split();
            if(this.accelDone){ const bst=1+LEVELS[this.lvl].acc; ch.forEach(c=>{c.boosted=true;c.spdFactor=bst;}); }
            this.atoms.push(...ch);
            if(!h.isJetRay) h.alive=false;
            break;
          }
        }
      }
      pl.harps=pl.harps.filter(h=>h.alive);
    }
    // Player ↔ atom
    for(const pl of this.players){
      if(!pl.alive||pl.inv>0) continue;
      const b=pl.bounds();
      for(const a of this.atoms){
        if(!a.alive) continue;
        if(a.hitsR(b)){ if(pl.hit()) this.score=Math.max(0,this.score-2000); break; }
      }
    }
    // Power-ups
    this.puTimer-=dtf;
    if(this.puTimer<=0&&this.atoms.length>0){
      const t=PU_TYPES[ri(0,PU_TYPES.length-1)];
      this.pups.push(new Canister(rr(40,W-40),t));
      this.puTimer=ri(PU_SPAWN_MIN,PU_SPAWN_MAX);
    }
    for(const pu of this.pups){
      pu.update(dtf*tm);
      if(!pu.alive) continue;
      for(const pl of this.players){
        if(!pl.alive) continue;
        if(pu.hitsR(pl.bounds())){
          if(pu.type.id==='extraLife'){
            pl.lives=Math.min(pl.lives+1,9);
          } else if(pu.type.id==='vaporize'){
            const alive=this.atoms.filter(a=>a.alive);
            if(alive.length>0){
              const target=alive[ri(0,alive.length-1)];
              if(target.sz==='u'){
                this.ftexts.push(new FText(target.x,target.y-target.r,T('VAPORIZED ☢'),'#ff2222'));
              } else {
                const pts=ATOM_DEFS[target.sz].pts;
                this.score+=pts;
                this.ftexts.push(new FText(target.x,target.y-target.r,`+${pts} ✦`,'#ff2222'));
              }
              this.spawnFx(target);
              this.rings.push(new Ring(target.x,target.y,'#ff2222',target.r*3));
              target.alive=false;
              sfx.pop(target.sz==='u'?3:Math.min(target.sz,3));
            }
          } else {
            pl.applyPU(pu.type);
          }
          pu.alive=false;
          this.flashes.push(new PUFlash(pu.x,pu.y,pu.type.col,T(pu.type.lbl)));
          for(let i=0;i<12;i++) this.sparks.push(new Spark(pu.x,pu.y,pu.type.col));
          sfx.pickup(); break;
        }
      }
    }
    this.pups=this.pups.filter(p=>p.alive);
    this.atoms=this.atoms.filter(a=>a.alive);
    // Effects
    for(const s of this.sparks) s.update(dtf); this.sparks=this.sparks.filter(s=>s.life>0);
    for(const r of this.rings) r.update(dtf); this.rings=this.rings.filter(r=>r.life>0);
    for(const f of this.flashes) f.update(dtf); this.flashes=this.flashes.filter(f=>f.life>0);
    for(const f of this.ftexts) f.update(dtf); this.ftexts=this.ftexts.filter(f=>f.life>0);
    // Win
    const regularAlive=this.atoms.filter(a=>a.alive&&a.sz!=='u').length;
    if(regularAlive===0&&this.state==='playing'){
      CG.gameplayStop(); YG.gameplayStop();
      this.state='levelComplete'; this.stTimer=3*FPS; this.lastTime=0; sfx.lvlDone();
      if(this.lvl+1>this.unlockedLvl){
        this.unlockedLvl=this.lvl+1;
        this.saveProgress();
      }
    }
    // Game over
    if(this.players.every(p=>!p.alive)&&this.state==='playing'){
      CG.gameplayStop(); YG.gameplayStop();
      this.state='gameOver'; this.stTimer=0; this.rewardedOffered=false; sfx.over();
    }
  }
  uLvlDone(){
    this.stTimer-=this.dtf;
    if(this.stTimer<=0){
      this.showMidgameAd(()=>{
        if(this.lvl>=LEVELS.length-1){
          this.state='victory';
          CG.happytime();
          YG.submitScore('highscore',this.score);
        } else if(this.gameMode==='hardcore'){
          this.startLevel(this.lvl+1);
          this.state='levelIntro'; this.stTimer=3*FPS;
        } else {
          this.lsCursor=Math.min(this.lvl+1,LEVELS.length-1);
          this.state='levelSelect';
        }
      });
    }
  }
  uEnd(){
    // Rewarded video button (game-over only, once per death)
    const adAvail=!this.rewardedOffered&&this.state==='gameOver'&&(YG.available||CG.available);
    if(adAvail&&this.mc){
      const rw=340,rx=W/2-rw/2;
      if(this.btn(rx,340,rw,40)){
        sfx.click(); this.rewardedOffered=true;
        this.showRewardedAd(
          ()=>{ // success — revive with 1 life
            for(const p of this.players) if(!p.alive){ p.alive=true; p.lives=1; p.inv=150; }
            this.state='playing'; CG.gameplayStart(); YG.gameplayStart();
          },
          ()=>{} // fail — stay on game over
        );
        return;
      }
    }
    if(this.mc||this.inp.jp.has('Enter')||this.inp.jp.has('Space')){
      sfx.click();
      const wasGameOver=this.state==='gameOver'&&this.gameMode==='normal';
      this.showMidgameAd(()=>{
        if(wasGameOver){
          this.lsCursor=this.lvl;
          this.state='levelSelect';
        } else {
          this.state='menu';
        }
      });
    }
  }
  spawnFx(a){
    const col=ATOM_COL[a.sz].c,cnt=10+(typeof a.sz==='number'?a.sz:3)*6;
    for(let i=0;i<cnt;i++) this.sparks.push(new Spark(a.x,a.y,col));
    for(let i=0;i<4;i++) this.sparks.push(new Spark(a.x,a.y,'#fff'));
    this.rings.push(new Ring(a.x,a.y,col,a.r*2.5));
  }
  showMidgameAd(afterFn){
    if(this.adPlaying) return;
    // Prefer Yandex interstitial, fall back to CrazyGames
    if(YG.available){
      this.adPlaying=true; this._soundBeforeAd=sfx.on; sfx.on=false;
      YG.showFullscreenAdv({
        onClose:()=>{ sfx.on=this._soundBeforeAd; this.adPlaying=false; this.lastTime=0; afterFn(); },
        onError:()=>{ sfx.on=this._soundBeforeAd; this.adPlaying=false; this.lastTime=0; afterFn(); }
      });
      return;
    }
    this.adPlaying=true; this._soundBeforeAd=sfx.on;
    CG.requestAd('midgame',{
      adStarted:()=>{ sfx.on=false; },
      adFinished:()=>{ sfx.on=this._soundBeforeAd; this.adPlaying=false; this.lastTime=0; afterFn(); },
      adError:()=>{ sfx.on=this._soundBeforeAd; this.adPlaying=false; this.lastTime=0; afterFn(); }
    });
  }
  /** Show rewarded video ad (Yandex preferred, then CG, else immediate fail) */
  showRewardedAd(onSuccess,onFail){
    if(this.adPlaying){ onFail(); return; }
    this.adPlaying=true; this._soundBeforeAd=sfx.on;
    const done=(ok)=>{ sfx.on=this._soundBeforeAd; this.adPlaying=false; this.lastTime=0; ok?onSuccess():onFail(); };
    if(YG.available){
      sfx.on=false; let rewarded=false;
      YG.showRewardedVideo({
        onOpen:()=>{}, onRewarded:()=>{ rewarded=true; },
        onClose:()=>{ done(rewarded); },
        onError:()=>{ done(false); }
      });
      return;
    }
    if(CG.available){
      CG.requestAd('rewarded',{
        adStarted:()=>{ sfx.on=false; },
        adFinished:()=>{ done(true); },
        adError:()=>{ done(false); }
      });
      return;
    }
    this.adPlaying=false; onFail();
  }

  // ---- Draw ----
  draw(){
    const ctx=this.ctx;
    // Scale context so game coordinates (800×600) map to actual canvas resolution
    ctx.setTransform(this.cv.width/W, 0, 0, this.cv.height/H, 0, 0);
    this.drawBG(ctx);
    switch(this.state){
      case 'menu': this.dMenu(ctx); break;
      case 'encyclopedia': this.dEncyclopedia(ctx); break;
      case 'levelSelect': this.dLevelSelect(ctx); break;
      case 'levelIntro': this.dGame(ctx); this.dIntro(ctx); break;
      case 'playing': this.dGame(ctx); this.dHUD(ctx); break;
      case 'paused': this.dGame(ctx); this.dHUD(ctx); this.dPause(ctx); break;
      case 'levelComplete': this.dGame(ctx); this.dHUD(ctx); this.dLvlDone(ctx); break;
      case 'gameOver': this.dGame(ctx); this.dHUD(ctx); this.dOver(ctx); break;
      case 'victory': this.dGame(ctx); this.dHUD(ctx); this.dVictory(ctx); break;
    }
    // Touch controls overlay (only during gameplay)
    if(this.touch){ this.touch.visible=(this.state==='playing'); this.touch.draw(ctx); }
  }
  drawBG(ctx){
    const bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#030810'); bg.addColorStop(0.6,'#020408'); bg.addColorStop(1,'#010204');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
    if(this.timeMul<1){ ctx.fillStyle='rgba(100,50,200,0.04)'; ctx.fillRect(0,0,W,H); }
    for(const n of this.nebulae) n.draw(ctx);
    for(const s of this.stars) s.draw(ctx,this.frame);
  }
  dFloor(ctx){
    ctx.fillStyle='#080c10'; ctx.fillRect(0,GROUND,W,H-GROUND);
    ctx.strokeStyle='rgba(57,255,20,0.08)'; ctx.lineWidth=1;
    for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,GROUND);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=GROUND;y<H;y+=10){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.shadowColor='#39ff14';ctx.shadowBlur=8;ctx.strokeStyle='rgba(57,255,20,0.4)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(0,GROUND);ctx.lineTo(W,GROUND);ctx.stroke();ctx.shadowBlur=0;
    const pu=0.15+0.1*Math.sin(this.frame*0.03);
    const fg=ctx.createLinearGradient(0,GROUND,0,GROUND+20);
    fg.addColorStop(0,`rgba(57,255,20,${pu})`);fg.addColorStop(1,'transparent');
    ctx.fillStyle=fg;ctx.fillRect(0,GROUND,W,20);
  }
  dGame(ctx){
    if(this.windActive&&this.windPow>0) for(const ws of this.wStreaks) ws.draw(ctx,this.windGustDir);
    this.dFloor(ctx);
    if(this.lever) this.lever.draw(ctx);
    for(const p of this.plats) p.draw(ctx);
    for(const r of this.rings) r.draw(ctx);
    for(const a of this.atoms) a.draw(ctx);
    for(const pu of this.pups) pu.draw(ctx);
    for(const pl of this.players){
      for(const h of pl.harps) h.draw(ctx);
      pl.draw(ctx,this.frame);
    }
    for(const s of this.sparks) s.draw(ctx);
    for(const f of this.flashes) f.draw(ctx);
    for(const f of this.ftexts) f.draw(ctx);
    if(this.timeMul<1){
      const g=ctx.createRadialGradient(W/2,H/2,W*0.3,W/2,H/2,W*0.7);
      g.addColorStop(0,'transparent');g.addColorStop(1,'rgba(100,30,180,0.12)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    }
  }
  dHUD(ctx){
    ctx.save();
    ctx.fillStyle='#888'; ctx.font="10px 'Share Tech Mono',monospace"; ctx.textAlign='center';
    ctx.fillText(T('LEVEL {0}',this.lvl+1)+(this.gameMode==='hardcore'?T(' [HARDCORE]'):''),W/2,14);
    ctx.fillStyle='#fff700'; ctx.shadowColor='#fff700'; ctx.shadowBlur=4;
    ctx.font="bold 20px 'Orbitron',sans-serif";
    ctx.fillText(this.score,W/2,36); ctx.shadowBlur=0;
    if(!this.accelDone){
      const pct=Math.max(0,this.lvlTimer/(LEVELS[this.lvl].timer*FPS));
      const tw=200,tx=W/2-tw/2,ty=42;
      ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fillRect(tx,ty,tw,4);
      const tc=pct>0.25?'#39ff14':(pct>0.1?'#ff8833':'#ff3333');
      ctx.fillStyle=tc; ctx.fillRect(tx,ty,tw*pct,4);
      if(pct<0.15){ctx.globalAlpha=0.5+0.5*Math.sin(this.frame*0.2);ctx.fillRect(tx,ty,tw*pct,4);ctx.globalAlpha=1;}
    } else {
      ctx.fillStyle='#ff3333'; ctx.font="bold 10px 'Orbitron',sans-serif";
      ctx.fillText(T('⚠ ACCELERATED'),W/2,50);
    }
    for(let i=0;i<this.players.length;i++){
      const pl=this.players[i], bx=i===0?12:W-12, al=i===0?'left':'right';
      ctx.textAlign=al; ctx.fillStyle=pl.th.suit; ctx.shadowColor=pl.th.suit; ctx.shadowBlur=4;
      ctx.font="bold 12px 'Orbitron',sans-serif";
      ctx.fillText('☢ '+T(pl.th.lbl),bx,18); ctx.shadowBlur=0;
      ctx.fillStyle=pl.alive?pl.th.suit:'#ff3333';
      ctx.font="13px 'Share Tech Mono',monospace";
      ctx.fillText(pl.alive?T('LIVES {0}',pl.lives):T('☠ DEAD'),bx,34);
      const efx=pl.activeFx();
      for(let j=0;j<efx.length;j++){
        const ef=efx[j], ey=50+j*20, bw=55;
        ctx.fillStyle=ef.col; ctx.font="10px 'Orbitron',sans-serif";
        ctx.fillText(`${ef.ic} ${T(ef.lbl)}`,bx,ey);
        const pct=ef.rem/ef.dur, barX=i===0?bx:bx-bw, barY=ey+3;
        ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(barX,barY,bw,4);
        ctx.fillStyle=ef.col; ctx.globalAlpha=0.7; ctx.fillRect(barX,barY,bw*pct,4);
        if(pct<0.25){ctx.globalAlpha=0.3+0.3*Math.sin(this.frame*0.2);ctx.fillRect(barX,barY,bw*pct,4);}
        ctx.globalAlpha=1;
      }
    }
    let indicatorY=56;
    if(this.windActive&&this.windPow>0){
      ctx.fillStyle='rgba(170,221,255,0.7)'; ctx.font="bold 11px 'Share Tech Mono',monospace"; ctx.textAlign='center';
      const arrow=this.windGustDir>0?T('WIND →'):T('← WIND');
      const str=this.windPow>=2.5?T('STRONG '):'';
      ctx.fillText(`⚡ ${str}${arrow} ⚡`,W/2,indicatorY);
      indicatorY+=16;
    }
    if(this.lever&&this.lever.active){
      ctx.fillStyle='rgba(255,136,51,0.7)'; ctx.font="bold 11px 'Share Tech Mono',monospace"; ctx.textAlign='center';
      ctx.fillText(T('■ PLATFORMS LOCKED ■'),W/2,indicatorY);
      indicatorY+=16;
    }
    if(this.unstableActive){
      const ua=0.5+0.3*Math.sin(this.frame*0.12);
      ctx.fillStyle=`rgba(255,200,0,${ua})`; ctx.font="bold 11px 'Share Tech Mono',monospace"; ctx.textAlign='center';
      ctx.fillText(T('☢ UNSTABLE ATOM — SPLITS ×4 ☢'),W/2,indicatorY);
    }
    // Pause hint
    ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.font="9px 'Share Tech Mono',monospace"; ctx.textAlign='right';
    ctx.fillText(T('[P / ESC] PAUSE'),W-6,H-6);
    ctx.restore();
  }
  dPause(ctx){
    this.dOverlay(ctx,0.75);
    const cx=W/2;
    ctx.save(); ctx.textAlign='center';
    ctx.fillStyle='#39ff14'; ctx.shadowColor='#39ff14'; ctx.shadowBlur=14;
    ctx.font="900 38px 'Orbitron',sans-serif";
    ctx.fillText(T('PAUSED'),cx,230);
    ctx.shadowBlur=0;
    ctx.fillStyle='#667'; ctx.font="12px 'Share Tech Mono',monospace";
    ctx.fillText(T('LEVEL {0}',this.lvl+1)+' — '+T(LEVELS[this.lvl].name),cx,260);
    const items=[T('▶  CONTINUE'),T('☰  CHOOSE LEVEL'),T('⌂  RETURN HOME')];
    for(let i=0;i<items.length;i++){
      const y=280+i*55;
      const hov=this.btn(cx-130,y,260,42)||this.pauseSel===i;
      ctx.strokeStyle=hov?'#39ff14':'rgba(57,255,20,0.3)';
      ctx.lineWidth=hov?2:1;
      ctx.fillStyle=hov?'rgba(57,255,20,0.06)':'transparent';
      ctx.fillRect(cx-130,y,260,42);
      ctx.strokeRect(cx-130,y,260,42);
      ctx.fillStyle=hov?'#39ff14':'rgba(57,255,20,0.6)';
      ctx.font="14px 'Share Tech Mono',monospace";
      ctx.fillText(items[i],cx,y+26);
    }
    ctx.fillStyle='#445'; ctx.font="11px 'Share Tech Mono',monospace";
    ctx.fillText(T('Press P or ESC to resume'),cx,470);
    ctx.restore();
  }

  dOverlay(ctx,a){
    ctx.fillStyle=`rgba(2,4,8,${a||0.75})`; ctx.fillRect(0,0,W,H);
  }
  dMenu(ctx){
    this.dOverlay(ctx,0.92);
    const cx=W/2;
    ctx.save();
    ctx.fillStyle='#39ff14'; ctx.shadowColor='#39ff14'; ctx.shadowBlur=20;
    ctx.font="900 64px 'Orbitron',sans-serif"; ctx.textAlign='center';
    ctx.fillText(T('Nucleon'),cx,120);
    ctx.shadowBlur=0; ctx.fillStyle='#556'; ctx.font="14px 'Share Tech Mono',monospace";
    ctx.fillText(T('SPLIT ATOMS · SURVIVE THE CHAIN REACTION'),cx,150);
    const items=[
      {y:240,h:40,lbl:this.numP===1?T('PLAYERS: ① SOLO'):T('PLAYERS: ②  CO-OP'),sel:0},
      {y:290,h:40,lbl:this.gameMode==='normal'?T('MODE: ☰ NORMAL'):T('MODE: ☠ HARDCORE'),sel:1},
      {y:340,h:40,lbl:sfx.on?T('SOUND: ON ♪'):T('SOUND: OFF ✕'),sel:2},
      {y:390,h:40,lbl:T('⚛  ENCYCLOPEDIA'),sel:3},
      {y:450,h:50,lbl:T('▶  START REACTOR'),sel:4},
    ];
    for(const it of items){
      const hov=this.btn(250,it.y,300,it.h)||this.menuSel===it.sel;
      ctx.strokeStyle=hov?'#39ff14':'rgba(57,255,20,0.3)';
      ctx.lineWidth=hov?2:1; ctx.fillStyle=hov?'rgba(57,255,20,0.06)':'transparent';
      ctx.fillRect(250,it.y,300,it.h); ctx.strokeRect(250,it.y,300,it.h);
      ctx.fillStyle=hov?'#39ff14':'rgba(57,255,20,0.6)';
      ctx.font=it.sel===4?"bold 16px 'Orbitron',sans-serif":"14px 'Share Tech Mono',monospace";
      ctx.fillText(it.lbl,cx,it.y+it.h/2+5);
    }
    ctx.fillStyle='#445'; ctx.font="10px 'Share Tech Mono',monospace";
    if(this.gameMode==='normal'){
      ctx.fillText(T('Normal: Level select, fresh lives per level'),cx,520);
    } else {
      ctx.fillText(T('Hardcore: All levels in sequence, lives carry over'),cx,520);
    }
    ctx.fillStyle='#445'; ctx.font="11px 'Share Tech Mono',monospace";
    ctx.fillText(T('P1: A/D move · W shoot   |   P2: ←/→ move · ↑/Space shoot'),cx,545);
    ctx.fillText(T('H · He · Ne · Ar · Kr · ²³⁵U — 20 LEVELS'),cx,565);
    ctx.fillText(T('Arrow keys / Enter to navigate · P or ESC to pause'),cx,582);
    ctx.restore();
  }
  // ===================== ENCYCLOPEDIA =====================
  dEncyclopedia(ctx){
    this.dOverlay(ctx,0.94);
    const cx=W/2;
    ctx.save();
    // Title
    ctx.fillStyle='#39ff14'; ctx.shadowColor='#39ff14'; ctx.shadowBlur=12;
    ctx.font="bold 24px 'Orbitron',sans-serif"; ctx.textAlign='center';
    ctx.fillText(T('ENCYCLOPEDIA'),cx,36);
    ctx.shadowBlur=0;
    // Tabs
    const tabLabels=[T('⚛ ELEMENTS'),T('⚡ ISOTOPE CANISTERS'),T('⌨ HOW TO PLAY')];
    const tabW=200, tabH=28, tabY=50;
    for(let i=0;i<this.encPages;i++){
      const tx=cx-this.encPages*tabW/2+i*tabW;
      const sel=this.encPage===i;
      const hov=this.btn(tx,tabY,tabW,tabH);
      ctx.fillStyle=sel?'rgba(57,255,20,0.12)':(hov?'rgba(57,255,20,0.06)':'transparent');
      ctx.fillRect(tx,tabY,tabW,tabH);
      ctx.strokeStyle=sel?'#39ff14':'rgba(57,255,20,0.2)';
      ctx.lineWidth=sel?2:1;
      ctx.strokeRect(tx,tabY,tabW,tabH);
      ctx.fillStyle=sel?'#39ff14':'rgba(57,255,20,0.5)';
      ctx.font="bold 11px 'Orbitron',sans-serif"; ctx.textAlign='center';
      ctx.fillText(tabLabels[i],tx+tabW/2,tabY+18);
    }
    // Content area
    const cTop=90;
    if(this.encPage===0) this.dEncElements(ctx,cTop);
    else if(this.encPage===1) this.dEncPowerUps(ctx,cTop);
    else this.dEncHowToPlay(ctx,cTop);
    // Back button
    const bHov=this.btn(300,560,200,28);
    ctx.strokeStyle=bHov?'#39ff14':'rgba(57,255,20,0.3)';
    ctx.lineWidth=bHov?2:1;
    ctx.fillStyle=bHov?'rgba(57,255,20,0.06)':'transparent';
    ctx.fillRect(300,560,200,28);
    ctx.strokeRect(300,560,200,28);
    ctx.fillStyle=bHov?'#39ff14':'rgba(57,255,20,0.5)';
    ctx.font="12px 'Share Tech Mono',monospace"; ctx.textAlign='center';
    ctx.fillText(T('ESC — BACK TO MENU'),400,578);
    // Nav hint
    ctx.fillStyle='#334'; ctx.font="9px 'Share Tech Mono',monospace";
    ctx.fillText(T('← → or click tabs to switch pages'),cx,555);
    ctx.restore();
  }
  dEncElements(ctx,top){
    const cx=W/2;
    const elements=[
      {sz:4,name:'Krypton',el:'Kr',type:'Regular',col:ATOM_COL[4].c,note:'Largest atom. 4 tilted elliptical orbits. First appears on Level 9.'},
      {sz:3,name:'Argon',el:'Ar',type:'Regular',col:ATOM_COL[3].c,note:'3 tilted orbits. Classic symmetry. Main atom throughout all levels.'},
      {sz:2,name:'Neon',el:'Ne',type:'Regular',col:ATOM_COL[2].c,note:'2 crossing elliptical orbits. Produced by Uranium fission.'},
      {sz:1,name:'Helium',el:'He',type:'Regular',col:ATOM_COL[1].c,note:'Tiny. 1 elliptical orbit with 2 electrons.'},
      {sz:0,name:'Hydrogen',el:'H',type:'Regular',col:ATOM_COL[0].c,note:'Smallest atom. 1 orbit, 1 electron. Sparkly poof on destroy.'},
      {sz:'u',name:'Uranium-235',el:'²³⁵U',type:'HAZARD',col:ATOM_COL.u.c,note:'DO NOT HIT! Fission → 10 Neon flood. Costs -500 pts.'},
    ];
    // Header row
    ctx.fillStyle='#667'; ctx.font="bold 10px 'Orbitron',sans-serif"; ctx.textAlign='left';
    const lx=30;
    ctx.fillText(T('ELEMENT'),lx,top+12);
    ctx.fillText(T('SIZE'),lx+150,top+12);
    ctx.fillText(T('RADIUS'),lx+200,top+12);
    ctx.fillText(T('POINTS'),lx+270,top+12);
    ctx.fillText(T('BOUNCE'),lx+340,top+12);
    ctx.fillText(T('ORBITS'),lx+410,top+12);
    ctx.fillText(T('ELECTRONS'),lx+470,top+12);
    ctx.strokeStyle='rgba(57,255,20,0.15)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(lx,top+18); ctx.lineTo(W-30,top+18); ctx.stroke();
    // Rows
    for(let i=0;i<elements.length;i++){
      const e=elements[i], d=ATOM_DEFS[e.sz], ry=top+36+i*70;
      const isU=e.sz==='u';
      // Background
      if(isU){
        ctx.fillStyle='rgba(255,30,30,0.04)'; ctx.fillRect(lx-4,ry-12,W-52,66);
      }
      // Symbol circle
      ctx.save();
      ctx.translate(lx+12,ry+8);
      ctx.shadowColor=e.col; ctx.shadowBlur=8;
      ctx.fillStyle=e.col; ctx.globalAlpha=0.15;
      ctx.beginPath(); ctx.arc(0,0,14,0,TWO_PI); ctx.fill();
      ctx.globalAlpha=1; ctx.shadowBlur=4;
      ctx.fillStyle=e.col; ctx.font="bold 12px 'Orbitron',sans-serif"; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(e.el,0,0);
      ctx.restore();
      // Name + type
      ctx.textAlign='left'; ctx.textBaseline='alphabetic';
      ctx.fillStyle=e.col; ctx.font="bold 12px 'Orbitron',sans-serif";
      ctx.fillText(T(e.name),lx+32,ry+4);
      ctx.fillStyle=isU?'#ff4444':'#556'; ctx.font="9px 'Share Tech Mono',monospace";
      ctx.fillText(isU?'☢ '+T('HAZARD'):T('Regular'),lx+32,ry+17);
      // Stats
      ctx.fillStyle='#aaa'; ctx.font="12px 'Share Tech Mono',monospace";
      ctx.fillText(isU?'—':String(e.sz),lx+158,ry+8);
      ctx.fillText(`${d.r}px`,lx+200,ry+8);
      ctx.fillStyle=isU?'#ff4444':'#aaa';
      ctx.fillText(`${d.pts>0?'+':''}${d.pts}`,lx+270,ry+8);
      ctx.fillStyle='#aaa';
      ctx.fillText(String(BOUNCE_VEL[e.sz]),lx+348,ry+8);
      ctx.fillText(String(d.orb),lx+420,ry+8);
      ctx.fillText(String(d.nE),lx+490,ry+8);
      // Note
      ctx.fillStyle='#445'; ctx.font="9px 'Share Tech Mono',monospace";
      ctx.fillText(T(e.note),lx+32,ry+32);
      // Splits into
      if(e.sz!=='u'&&e.sz>0){
        const nextName=elements.find(x=>x.sz===e.sz-1);
        ctx.fillStyle='#556'; ctx.fillText(T('Splits → 2× {0}  (unstable: 4×)',nextName?T(nextName.name):'—'),lx+32,ry+44);
      } else if(isU){
        ctx.fillStyle='#ff6644'; ctx.fillText(T('Fission → 10× Neon atoms'),lx+32,ry+44);
      } else {
        ctx.fillStyle='#556'; ctx.fillText(T('Final atom — destroyed on hit'),lx+32,ry+44);
      }
      // Separator
      if(i<elements.length-1){
        ctx.strokeStyle='rgba(57,255,20,0.06)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(lx,ry+56); ctx.lineTo(W-30,ry+56); ctx.stroke();
      }
    }
  }
  dEncPowerUps(ctx,top){
    const lx=40;
    ctx.fillStyle='#667'; ctx.font="bold 10px 'Orbitron',sans-serif"; ctx.textAlign='left';
    ctx.fillText(T('ISOTOPE CANISTERS — Appear every 3-8 seconds. Walk into them to activate.'),lx,top+12);
    ctx.strokeStyle='rgba(57,255,20,0.15)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(lx,top+18); ctx.lineTo(W-40,top+18); ctx.stroke();
    for(let i=0;i<PU_TYPES.length;i++){
      const pu=PU_TYPES[i], ry=top+32+i*48;
      // Icon hex
      ctx.save();
      ctx.translate(lx+14,ry+10);
      ctx.fillStyle='#0a0e14'; ctx.strokeStyle=pu.col; ctx.lineWidth=1.5;
      ctx.shadowColor=pu.col; ctx.shadowBlur=6;
      ctx.beginPath();
      for(let j=0;j<6;j++){const a=(TWO_PI/6)*j-Math.PI/6;if(j===0)ctx.moveTo(Math.cos(a)*12,Math.sin(a)*12);else ctx.lineTo(Math.cos(a)*12,Math.sin(a)*12);}
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle=pu.col; ctx.font="bold 12px 'Orbitron',sans-serif"; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(pu.ic,0,0);
      ctx.restore();
      // Name
      ctx.textAlign='left'; ctx.textBaseline='alphabetic';
      ctx.fillStyle=pu.col; ctx.shadowColor=pu.col; ctx.shadowBlur=4;
      ctx.font="bold 12px 'Orbitron',sans-serif";
      ctx.fillText(T(pu.lbl),lx+34,ry+7);
      ctx.shadowBlur=0;
      // Duration
      if(pu.dur>0){
        ctx.fillStyle='#667'; ctx.font="10px 'Share Tech Mono',monospace";
        ctx.fillText(`${(pu.dur/FPS).toFixed(0)}s`,lx+180,ry+7);
      } else {
        ctx.fillStyle='#667'; ctx.font="10px 'Share Tech Mono',monospace";
        ctx.fillText(T('instant'),lx+180,ry+7);
      }
      // Description
      ctx.fillStyle='#999'; ctx.font="11px 'Share Tech Mono',monospace";
      ctx.fillText(T(pu.desc),lx+34,ry+24);
      // Separator
      if(i<PU_TYPES.length-1){
        ctx.strokeStyle='rgba(57,255,20,0.05)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(lx,ry+38); ctx.lineTo(W-40,ry+38); ctx.stroke();
      }
    }
  }
  dEncHowToPlay(ctx,top){
    const lx=40, cx=W/2;
    const mono="11px 'Share Tech Mono',monospace";
    const head="bold 12px 'Orbitron',sans-serif";
    let y=top;
    const section=(title,yy)=>{
      ctx.fillStyle='#39ff14'; ctx.font=head; ctx.textAlign='left';
      ctx.fillText(title,lx,yy);
      ctx.strokeStyle='rgba(57,255,20,0.15)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(lx,yy+4); ctx.lineTo(W-40,yy+4); ctx.stroke();
      return yy+20;
    };
    const line=(txt,yy,col)=>{
      ctx.fillStyle=col||'#999'; ctx.font=mono; ctx.textAlign='left';
      ctx.fillText(txt,lx+10,yy);
      return yy+16;
    };
    y=section(T('CONTROLS'),y);
    y=line(T('PLAYER 1:  A / D = move left/right   W = shoot ray'),y,'#39ff14');
    y=line(T('PLAYER 2:  ← / → = move left/right   ↑ / Space = shoot ray'),y,'#00d4ff');
    y=line(T('P or ESC = pause    (works with any keyboard layout)'),y);
    y+=6;
    y=section(T('OBJECTIVE'),y);
    y=line(T('Destroy all regular atoms by shooting rays at them.'),y);
    y=line(T('Atoms split into smaller atoms when hit (×2, or ×4 if unstable).'),y);
    y=line(T('Clear every non-Uranium atom to complete a level.'),y);
    y+=6;
    y=section(T('ATOMS & SPLITTING'),y);
    y=line(T('Kr → 2 Ar → 2 Ne → 2 He → 2 H → destroyed'),y);
    y=line(T('Unstable atoms (☢ glow, from Level 4) split into 4 instead of 2.'),y);
    y=line(T('All children of an unstable atom are also unstable!'),y);
    y=line(T('²³⁵U (Uranium) = HAZARD. Hitting it causes fission → 10 Neon flood, -500 pts.'),y,'#ff4444');
    y+=6;
    y=section(T('MECHANICS'),y);
    y=line(T('Timer: each level has a countdown. When it expires → atoms accelerate!'),y);
    y=line(T('Wind: random gusts push atoms left or right (varies per level).'),y);
    y=line(T('Platforms: static or moving barriers that block rays and atoms.'),y);
    y=line(T('Lever: walk into it to lock/unlock all moving platforms.'),y);
    y=line(T('Losing a life: -2000 pts. Player respawns at the same spot.'),y);
    y+=6;
    y=section(T('GAME MODES'),y);
    y=line(T('Normal: select any unlocked level. Fresh lives each attempt (5 or 7).'),y);
    y=line(T('Hardcore: play all 20 levels in order. Lives carry over. Bonus life every 5 levels.'),y);
  }

  dLevelSelect(ctx){
    this.dOverlay(ctx,0.92);
    const maxUnlocked=Math.min(this.unlockedLvl, LEVELS.length-1);
    ctx.save();
    ctx.fillStyle='#39ff14'; ctx.shadowColor='#39ff14'; ctx.shadowBlur=12;
    ctx.font="bold 28px 'Orbitron',sans-serif"; ctx.textAlign='center';
    ctx.fillText(T('SELECT LEVEL'),W/2,50);
    ctx.shadowBlur=0;
    ctx.fillStyle='#888'; ctx.font="12px 'Share Tech Mono',monospace";
    ctx.fillText(T('SCORE: {0}',this.score),W/2,72);
    const cardW=145, cardH=88, cols=5, gapX=154, gapY=100;
    for(let i=0;i<LEVELS.length;i++){
      const col=i%cols, row=Math.floor(i/cols);
      const cx=30+col*gapX, cy=95+row*gapY;
      const unlocked=i<=maxUnlocked;
      const hov=this.btn(cx,cy,cardW,cardH)&&unlocked;
      const sel=this.lsCursor===i&&unlocked;
      ctx.fillStyle=unlocked?(sel||hov?'rgba(57,255,20,0.1)':'rgba(57,255,20,0.03)'):'rgba(255,255,255,0.02)';
      ctx.fillRect(cx,cy,cardW,cardH);
      if(sel){ ctx.shadowColor='#39ff14'; ctx.shadowBlur=8; }
      ctx.strokeStyle=unlocked?(sel||hov?'#39ff14':'rgba(57,255,20,0.3)'):'rgba(255,255,255,0.08)';
      ctx.lineWidth=sel?2:1;
      ctx.strokeRect(cx,cy,cardW,cardH);
      ctx.shadowBlur=0;
      // Clip to card
      ctx.save();
      ctx.beginPath(); ctx.rect(cx+2,cy+2,cardW-4,cardH-4); ctx.clip();
      ctx.fillStyle=unlocked?(sel||hov?'#39ff14':'rgba(57,255,20,0.7)'):'rgba(255,255,255,0.12)';
      ctx.font="bold 22px 'Orbitron',sans-serif"; ctx.textAlign='center';
      ctx.fillText(i+1,cx+cardW/2,cy+26);
      ctx.fillStyle=unlocked?(sel||hov?'#aaa':'#556'):'rgba(255,255,255,0.06)';
      ctx.font="8px 'Share Tech Mono',monospace";
      ctx.fillText(T(LEVELS[i].name),cx+cardW/2,cy+44);
      if(!unlocked){
        ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.font="16px sans-serif";
        ctx.fillText('🔒',cx+cardW/2,cy+68);
      } else {
        const la=LEVELS[i].atoms;
        const regCount=la.filter(s=>s!=='u').length;
        const hasU=la.includes('u');
        const hasKr=la.includes(4);
        ctx.fillStyle='#445'; ctx.font="9px 'Share Tech Mono',monospace";
        ctx.fillText(T('{0} atoms · {1}s',regCount,LEVELS[i].timer),cx+cardW/2,cy+60);
        const feats=[];
        if(hasKr) feats.push('Kr');
        if(hasU) feats.push('☢U');
        if(LEVELS[i].windPow>0) feats.push('wind');
        if(LEVELS[i].plats.some(p=>p[0]==='mh'||p[0]==='mv')) feats.push('mPlat');
        else if(LEVELS[i].plats.length>0) feats.push('plat');
        if(LEVELS[i].lev!=null) feats.push('lever');
        if(i>=3) feats.push('☢');
        if(feats.length>0){
          ctx.fillStyle=hasU?'rgba(255,50,50,0.5)':'#334';
          ctx.font="8px 'Share Tech Mono',monospace";
          ctx.fillText(feats.join('·'),cx+cardW/2,cy+74);
        }
      }
      ctx.restore();
    }
    const bHov=this.btn(300,535,200,40);
    ctx.strokeStyle=bHov?'#39ff14':'rgba(57,255,20,0.3)';
    ctx.lineWidth=bHov?2:1;
    ctx.fillStyle=bHov?'rgba(57,255,20,0.06)':'transparent';
    ctx.fillRect(300,535,200,40);
    ctx.strokeRect(300,535,200,40);
    ctx.fillStyle=bHov?'#39ff14':'rgba(57,255,20,0.6)';
    ctx.font="14px 'Share Tech Mono',monospace"; ctx.textAlign='center';
    ctx.fillText(T('ESC — BACK TO MENU'),400,560);
    ctx.restore();
  }
  dIntro(ctx){
    this.dOverlay(ctx,0.8);
    const lv=LEVELS[this.lvl],cx=W/2;
    ctx.save(); ctx.textAlign='center';
    ctx.fillStyle='#39ff14'; ctx.shadowColor='#39ff14'; ctx.shadowBlur=16;
    ctx.font="900 48px 'Orbitron',sans-serif";
    ctx.fillText(T('LEVEL {0}',this.lvl+1),cx,200);
    ctx.shadowBlur=0; ctx.fillStyle='#aaa'; ctx.font="18px 'Orbitron',sans-serif";
    ctx.fillText(T(lv.name),cx,240);
    ctx.fillStyle='#667'; ctx.font="13px 'Share Tech Mono',monospace";
    const info=[];
    const regCount=lv.atoms.filter(s=>s!=='u').length;
    const hasU=lv.atoms.includes('u');
    const hasKr=lv.atoms.includes(4);
    info.push(T('ATOMS: {0}   |   TIMER: {1}s',regCount,lv.timer));
    if(hasKr) info.push(T('⚛ KRYPTON (Kr) DETECTED — LARGE ATOM'));
    if(hasU) info.push(T('☢ URANIUM-235 DETECTED — DO NOT HIT!'));
    if(this.lvl>=3) info.push(T('☢ UNSTABLE ATOMS MAY APPEAR — SPLIT ×4'));
    if(lv.windPow>0) info.push(lv.windPow>=2.5?T('WIND GUSTS: STRONG'):lv.windPow>=1.5?T('WIND GUSTS: MODERATE'):T('WIND GUSTS: MILD'));
    if(lv.plats.length>0) info.push(T('PLATFORMS: {0}',lv.plats.length));
    if(lv.lev!=null) info.push(T('PLATFORM LEVER AVAILABLE'));
    info.forEach((t,i)=>{
      if(t.includes('☢')&&(t.includes('235')||t.includes('УРАН'))) ctx.fillStyle='#ff4444';
      else if(t.includes('Kr')||t.includes('КРИПТОН')) ctx.fillStyle='#c8ffc8';
      else if(t.includes('☢')) ctx.fillStyle='#ffcc00';
      else ctx.fillStyle='#667';
      ctx.fillText(t,cx,290+i*22);
    });
    const sec=Math.ceil(this.stTimer/FPS);
    ctx.fillStyle='#fff700'; ctx.font="bold 36px 'Orbitron',sans-serif";
    ctx.shadowColor='#fff700'; ctx.shadowBlur=10;
    ctx.fillText(sec,cx,440);
    ctx.restore();
  }
  dLvlDone(ctx){
    this.dOverlay(ctx,0.7);
    ctx.save(); ctx.textAlign='center';
    ctx.fillStyle='#39ff14'; ctx.shadowColor='#39ff14'; ctx.shadowBlur=16;
    ctx.font="900 36px 'Orbitron',sans-serif";
    ctx.fillText(T('LEVEL COMPLETE'),W/2,240);
    ctx.shadowBlur=0; ctx.fillStyle='#aaa'; ctx.font="16px 'Share Tech Mono',monospace";
    ctx.fillText(T('SCORE: {0}',this.score),W/2,290);
    if(this.lvl<LEVELS.length-1){
      ctx.fillStyle='#667'; ctx.font="13px 'Share Tech Mono',monospace";
      ctx.fillText(T('NEXT: LEVEL {0} — {1}',this.lvl+2,T(LEVELS[this.lvl+1].name)),W/2,330);
    }
    ctx.restore();
  }
  dOver(ctx){
    this.dOverlay(ctx,0.8);
    ctx.save(); ctx.textAlign='center';
    ctx.fillStyle='#ff4444'; ctx.shadowColor='#ff4444'; ctx.shadowBlur=20;
    ctx.font="900 42px 'Orbitron',sans-serif";
    ctx.fillText(T('MELTDOWN ☢'),W/2,220);
    ctx.shadowBlur=0; ctx.fillStyle='#aaa'; ctx.font="16px 'Share Tech Mono',monospace";
    ctx.fillText(T('REACHED LEVEL {0} — {1}',this.lvl+1,T(LEVELS[this.lvl].name)),W/2,270);
    ctx.fillText(T('FINAL SCORE: {0}',this.score),W/2,300);
    // Rewarded video button — offer once per game-over if ads are available
    if(!this.rewardedOffered&&(YG.available||CG.available)){
      const ry=340,rw=340,rx=W/2-rw/2;
      const hov=this.btn(rx,ry,rw,40);
      ctx.strokeStyle=hov?'#fff700':'rgba(255,247,0,0.3)'; ctx.lineWidth=hov?2:1;
      ctx.fillStyle=hov?'rgba(255,247,0,0.08)':'transparent';
      ctx.fillRect(rx,ry,rw,40); ctx.strokeRect(rx,ry,rw,40);
      ctx.fillStyle=hov?'#fff700':'rgba(255,247,0,0.6)';
      ctx.font="bold 14px 'Orbitron',sans-serif";
      ctx.fillText(T('▶ WATCH AD FOR +1 LIFE'),W/2,ry+26);
    }
    ctx.fillStyle='#667'; ctx.font="14px 'Share Tech Mono',monospace";
    const retY=(!this.rewardedOffered&&(YG.available||CG.available))?400:380;
    if(this.gameMode==='normal'){
      ctx.fillText(T('CLICK OR PRESS ENTER TO RETRY'),W/2,retY);
    } else {
      ctx.fillText(T('CLICK OR PRESS ENTER TO RETURN'),W/2,retY);
    }
    ctx.restore();
  }
  dVictory(ctx){
    this.dOverlay(ctx,0.8);
    ctx.save(); ctx.textAlign='center';
    const pulse=0.7+0.3*Math.sin(this.frame*0.05);
    ctx.fillStyle=`rgba(57,255,20,${pulse})`; ctx.shadowColor='#39ff14'; ctx.shadowBlur=20;
    ctx.font="900 40px 'Orbitron',sans-serif";
    ctx.fillText(T('FISSION COMPLETE ✦'),W/2,200);
    ctx.shadowBlur=0; ctx.fillStyle='#fff700'; ctx.font="bold 24px 'Orbitron',sans-serif";
    ctx.fillText(T('ALL 20 LEVELS CLEARED!'),W/2,250);
    ctx.fillStyle='#aaa'; ctx.font="18px 'Share Tech Mono',monospace";
    ctx.fillText(T('FINAL SCORE: {0}',this.score),W/2,300);
    ctx.fillStyle='#667'; ctx.font="14px 'Share Tech Mono',monospace";
    ctx.fillText(T('CLICK OR PRESS ENTER TO RETURN'),W/2,380);
    ctx.restore();
  }
}

// ===================== BOOT =====================
window.addEventListener('DOMContentLoaded', async () => {
  await CG.init();
  await YG.init();
  await document.fonts.ready;
  const game = new Game();
  await game.loadProgress();
});
