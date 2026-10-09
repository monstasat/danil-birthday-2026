'use strict';
const beatButton = document.querySelector('#beat');
const beatLabel = document.querySelector('#beat-label');
const portrait = document.querySelector('#portrait');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let audio, timer, step = 0, playing = false, master;
function drum(time, type) {
  if (type === 'kick') {
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.frequency.setValueAtTime(135, time); osc.frequency.exponentialRampToValueAtTime(42, time + .16);
    gain.gain.setValueAtTime(.8, time); gain.gain.exponentialRampToValueAtTime(.001, time + .25);
    osc.connect(gain).connect(master); osc.start(time); osc.stop(time + .26);
  } else {
    const length = type === 'snare' ? .15 : .045;
    const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * length), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
    source.buffer = buffer; filter.type = 'highpass'; filter.frequency.value = type === 'snare' ? 1200 : 7000;
    gain.gain.setValueAtTime(type === 'snare' ? .3 : .10, time); gain.gain.exponentialRampToValueAtTime(.001, time + length);
    source.connect(filter).connect(gain).connect(master); source.start(time);
  }
}
function tick() {
  const t = audio.currentTime + .01;
  drum(t, 'hat');
  if ([0, 6, 8, 14].includes(step)) drum(t, 'kick');
  if (step === 4 || step === 12) drum(t, 'snare');
  if (step % 4 === 0) {
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = 'triangle'; osc.frequency.value = [65.41, 77.78, 58.27, 65.41][step / 4];
    gain.gain.setValueAtTime(.18, t); gain.gain.exponentialRampToValueAtTime(.001, t + .34);
    osc.connect(gain).connect(master); osc.start(t); osc.stop(t + .35);
  }
  step = (step + 1) % 16;
}
function stopBeat() {
  clearInterval(timer); playing = false;
  if (audio) audio.suspend();
  beatButton.setAttribute('aria-pressed', 'false');
  beatButton.setAttribute('aria-label', 'Включить музыкальный бит');
  beatLabel.textContent = 'БИТ: ВЫКЛ.';
}
beatButton.addEventListener('click', async () => {
  if (playing) { stopBeat(); return; }
  try {
    if (!audio) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Audio unavailable');
      audio = new Audio(); master = audio.createGain(); master.gain.value = .25; master.connect(audio.destination);
    }
    await audio.resume(); step = 0; playing = true; tick(); timer = setInterval(tick, 60000 / 94 / 4);
    beatButton.setAttribute('aria-pressed', 'true'); beatButton.setAttribute('aria-label', 'Выключить музыкальный бит');
    beatLabel.textContent = 'БИТ: ВКЛ.'; burst();
  } catch { beatLabel.textContent = 'БИТ НЕДОСТУПЕН'; }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stopBeat(); });
if (!reducedMotion && matchMedia('(pointer: fine)').matches) {
  document.querySelector('.stage').addEventListener('pointermove', event => {
    const rect = event.currentTarget.getBoundingClientRect();
    portrait.style.setProperty('--px', `${(event.clientX - rect.left - rect.width / 2) / rect.width * 12}px`);
    portrait.style.setProperty('--py', `${(event.clientY - rect.top - rect.height / 2) / rect.height * 8}px`);
  });
  document.querySelector('.stage').addEventListener('pointerleave', () => { portrait.style.setProperty('--px', '0px'); portrait.style.setProperty('--py', '0px'); });
}
const canvas = document.querySelector('#confetti'), ctx = canvas.getContext('2d');
let particles = [], frame;
function burst() {
  if (reducedMotion || !ctx) return;
  cancelAnimationFrame(frame);
  const rect = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const colors = ['#e9ff67', '#ff87ba', '#f8f5e9'];
  particles = Array.from({length:65}, () => ({x:Math.random()*rect.width,y:-Math.random()*rect.height*.8,w:4+Math.random()*5,h:6+Math.random()*9,vx:(Math.random()-.5)*2,vy:2+Math.random()*3,r:Math.random()*6,vr:(Math.random()-.5)*.1,c:colors[Math.floor(Math.random()*3)]}));
  let last;
  function draw(time) {
    const delta = last ? Math.min((time-last)/16.67, 3) : 1; last = time;
    ctx.clearRect(0,0,rect.width,rect.height);
    particles.forEach(p => { p.x+=p.vx*delta;p.y+=p.vy*delta;p.r+=p.vr*delta;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.fillStyle=p.c;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore(); });
    particles = particles.filter(p => p.y < rect.height+25);
    if (particles.length) frame=requestAnimationFrame(draw); else ctx.clearRect(0,0,rect.width,rect.height);
  }
  frame=requestAnimationFrame(draw);
}
window.addEventListener('load', () => { if (!reducedMotion) setTimeout(burst, 700); }, {once:true});
