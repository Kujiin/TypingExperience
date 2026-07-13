const commonWords = [
  'alpha','brave','canyon','dawn','eagle','flame','garden','harbor','island','jungle','keystroke','lantern','mirror','nova','ocean','pearl','quiet','river','sunset','thunder','urban','velvet','whisper','xenial','yonder','zebra','anchor','breeze','cloud','dream','ember','feather','glow','horizon','ignite','jewel','lumen','meadow','noble','orbit','prism','quest','ripple','spark','tide','unity','violet','wave','xylophone','yield','zenith',
  'apple','banana','candle','dragon','forest','grace','honey','inspire','jigsaw','kitchen','lemon','marble','needle','oasis','piano','rocket','silver','tunnel','violet','winter','xenon','yellow','zodiac','acorn','beacon','cactus','dancer','echo','fable','galaxy','harvest','icicle','jester','knight','lively','mango','nimbus','opal','puzzle','quartz','ranger','saffron','trails','unfold','velora','willow','xenia','yarrow','zephyr',
  'adapt','bloom','charm','drift','evolve','focus','grit','humble','infinite','jovial','kindle','lumen','mosaic','nurture','origin','pioneer','quell','resonate','savor','tender','uplift','vivid','wander','xray','yearn','zeal',
  'biscuit','copper','desert','eclipse','frost','glisten','hush','indigo','jasmine','kimono','lavish','murmur','nectar','orchid','prayer','quiver','rhythm','saffire','thrive','upland','velour','whistle','xebec','yonder','zest',
  'adore','breathe','courage','delight','enchant','flicker','gather','hearth','inward','jubilant','lullaby','meander','narrate','overture','parade','quaint','radiant','serene','twilight','unite','velour','waltz','xanthe','yesteryear','zephyr',
  'ballet','crescent','dazzle','elegant','fountain','glimmer','harbor','imagine','jamboree','kaleido','luminous','mystic','nebula','opulent','pollen','quartz','radiate','solstice','triumph','undergo','velvet','whisper','xavier','yonder','zenith','aurora','breeze','cinder','dapple','equinox','fable','genius','harmony','ivory','jubilant','kestrel','lucent','murmur','nectar','orchid','prism','quell','ripple','satin','talisman','umbra','vantage','weave','xenia','yarrow','zodiac'
];

const keyboardRows = [
  ['`','1','2','3','4','5','6','7','8','9','0','-','='],
  ['q','w','e','r','t','y','u','i','o','p','[',']','\\'],
  ['a','s','d','f','g','h','j','k','l',';','\''],
  ['z','x','c','v','b','n','m',',','.','/']
];

const audio = new Audio('key.wav');
audio.preload = 'auto';
audio.volume = 0.35;

const audioContext = window.AudioContext ? new AudioContext() : null;

const state = {
  words: [],
  currentIndex: 0,
  startedAt: null,
  correctChars: 0,
  totalTypedChars: 0,
  sessionChars: 0,
  completedWords: 0,
  wpm: 0,
  accuracy: 100,
  bestWpm: Number(localStorage.getItem('typeflow-best-wpm') || 0),
  wordCount: 15,
  currentInput: ''
};

const elements = {
  wordDisplay: document.getElementById('wordDisplay'),
  typingInput: document.getElementById('typingInput'),
  wpmValue: document.getElementById('wpmValue'),
  accuracyValue: document.getElementById('accuracyValue'),
  timeValue: document.getElementById('timeValue'),
  bestValue: document.getElementById('bestValue'),
  progressText: document.getElementById('progressText'),
  wordCountSelect: document.getElementById('wordCountSelect'),
  randomizeBtn: document.getElementById('randomizeBtn'),
  restartBtn: document.getElementById('restartBtn'),
  keyboardSurface: document.getElementById('keyboardSurface'),
  activeKeyLabel: document.getElementById('activeKeyLabel')
};

function pickWordPool(count) {
  const shuffled = [...commonWords].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function buildWordList(count) {
  clearInterval(state.timerId);
  state.words = pickWordPool(count).map((word) => ({ text: word, done: false }));
  state.currentIndex = 0;
  state.startedAt = null;
  state.correctChars = 0;
  state.totalTypedChars = 0;
  state.sessionChars = 0;
  state.completedWords = 0;
  state.wpm = 0;
  state.accuracy = 100;
  state.currentInput = '';
  elements.typingInput.value = '';
  elements.typingInput.disabled = false;
  elements.typingInput.placeholder = 'Start typing here...';
  elements.typingInput.focus();
  renderWords();
  renderStats();
  renderKeyboard();
}

function renderWords() {
  elements.wordDisplay.innerHTML = '';
  const sentence = document.createElement('p');
  sentence.className = 'text-slate-100';
  state.words.forEach((word, index) => {
    const span = document.createElement('span');
    span.className = `word-chip transition ${index === state.currentIndex ? 'active' : 'text-slate-400'} ${word.done ? 'done text-[#aaa38c]' : ''}`;
    span.textContent = word.text + (index < state.words.length - 1 ? ' ' : '');
    sentence.appendChild(span);
  });
  elements.wordDisplay.appendChild(sentence);
  elements.progressText.textContent = `Progress: ${state.completedWords} / ${state.words.length}`;
}

function renderStats() {
  elements.wpmValue.textContent = state.wpm.toString();
  elements.accuracyValue.textContent = `${Math.round(state.accuracy)}%`;
  elements.bestValue.textContent = state.bestWpm.toString();
  const elapsed = state.startedAt ? Math.max(1, Math.floor((Date.now() - state.startedAt) / 1000)) : 0;
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');
  elements.timeValue.textContent = `${mins}:${secs}`;
}

function updateWpm() {
  if (!state.startedAt) return;
  const elapsedSeconds = Math.max(1, Math.floor((Date.now() - state.startedAt) / 1000));
  state.wpm = Math.round((state.sessionChars / 5) / (elapsedSeconds / 60));
  if (state.wpm > state.bestWpm) {
    state.bestWpm = state.wpm;
    localStorage.setItem('typeflow-best-wpm', String(state.bestWpm));
  }
  renderStats();
}

function updateAccuracy() {
  if (state.totalTypedChars === 0) {
    state.accuracy = 100;
  } else {
    state.accuracy = Math.max(0, Math.min(100, (state.correctChars / state.totalTypedChars) * 100));
  }
  renderStats();
}

function renderKeyboard() {
  elements.keyboardSurface.innerHTML = '';
  const shell = document.createElement('div');
  shell.className = 'relative rounded-[20px] bg-[#29231f]/95 p-2 sm:p-3';
  shell.style.position = 'relative';

  const keyboardWidth = Math.min(960, window.innerWidth - 60);
  const keyWidth = keyboardWidth / 13;
  const keyHeight = 56;

  keyboardRows.forEach((row, rowIndex) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'mb-2 flex gap-2';
    rowEl.style.marginLeft = rowIndex === 1 ? '20px' : rowIndex === 2 ? '36px' : rowIndex === 3 ? '60px' : '0px';

    row.forEach((key) => {
      const keyEl = document.createElement('button');
      keyEl.type = 'button';
      keyEl.className = 'keycap relative flex items-center justify-center rounded-2xl bg-[#29231f] text-sm font-semibold text-slate-100';
      keyEl.style.width = `${Math.max(38, keyWidth - 4)}px`;
      keyEl.style.height = `${keyHeight}px`;
      keyEl.dataset.key = key;
      keyEl.textContent = key;
      rowEl.appendChild(keyEl);
    });

    shell.appendChild(rowEl);
  });

  elements.keyboardSurface.appendChild(shell);
}

function playCue() {
  if (audioContext) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 720;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.035, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.12);
    oscillator.stop(audioContext.currentTime + 0.14);
  }

  if (audio.src) {
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch (error) {
      console.warn('Audio playback unavailable', error);
    }
  }
}

function animateKeyPress(key) {
  const keyEl = Array.from(document.querySelectorAll('.keycap')).find((node) => node.dataset.key?.toLowerCase() === key.toLowerCase());
  if (!keyEl) return;
  keyEl.classList.remove('pressed');
  void keyEl.offsetWidth;
  keyEl.classList.add('pressed');
  setTimeout(() => keyEl.classList.remove('pressed'), 140);

  elements.activeKeyLabel.textContent = `Pressed: ${key}`;
  const rect = keyEl.getBoundingClientRect();
  const floating = document.createElement('div');
  floating.className = 'floating-key';
  floating.textContent = key;
  floating.style.left = `${rect.left + rect.width / 2}px`;
  floating.style.top = `${rect.top + rect.height / 2}px`;
  floating.style.transform = 'translate(-50%, -50%)';
  document.body.appendChild(floating);
  setTimeout(() => floating.remove(), 700);

  playCue();
}

function advanceWord() {
  if (state.currentIndex < state.words.length - 1) {
    state.words[state.currentIndex].done = true;
    state.currentIndex += 1;
    renderWords();
    elements.typingInput.value = '';
    state.currentInput = '';
    elements.typingInput.focus();
  } else {
    finishSession();
  }
}

function finishSession() {
  state.words[state.currentIndex].done = true;
  renderWords();
  clearInterval(state.timerId);
  updateWpm();
  const message = `Session complete! ${state.completedWords} words typed at ${state.wpm} WPM.`;
  elements.typingInput.placeholder = message;
  elements.typingInput.disabled = true;
  elements.typingInput.value = '';
}

function handleInput(event) {
  const inputValue = event.target.value;
  state.currentInput = inputValue;
  const expectedWord = state.words[state.currentIndex]?.text || '';

  if (!state.startedAt) {
    state.startedAt = Date.now();
    state.timerId = setInterval(updateWpm, 1000);
  }

  if (inputValue === expectedWord) {
    state.correctChars += expectedWord.length;
    state.totalTypedChars += expectedWord.length;
    state.sessionChars += expectedWord.length;
    state.completedWords += 1;
    elements.typingInput.value = '';
    state.currentInput = '';
    advanceWord();
    updateAccuracy();
    updateWpm();
    return;
  }

  if (inputValue.endsWith(' ')) {
    const submitted = inputValue.trim();
    if (submitted) {
      state.totalTypedChars += submitted.length + 1;
      if (submitted === expectedWord) {
        state.correctChars += expectedWord.length;
        state.sessionChars += expectedWord.length;
        state.completedWords += 1;
        elements.typingInput.value = '';
        state.currentInput = '';
        advanceWord();
      } else {
        state.correctChars += Math.min(submitted.length, expectedWord.length);
        elements.typingInput.value = '';
        state.currentInput = '';
        advanceWord();
      }
      updateAccuracy();
      updateWpm();
    }
    return;
  }

  const typedLength = inputValue.length;
  state.totalTypedChars = Math.max(state.totalTypedChars, typedLength);
  updateAccuracy();
}

function handleKeydown(event) {
  const key = event.key;
  if (key.length === 1) {
    animateKeyPress(key);
  } else if (key === 'Backspace') {
    animateKeyPress('⌫');
  } else if (key === 'Enter') {
    animateKeyPress('↵');
  } else if (key === ' ') {
    animateKeyPress('Space');
  }
}

window.addEventListener('keydown', handleKeydown);
elements.typingInput.addEventListener('input', handleInput);
elements.wordCountSelect.addEventListener('change', (event) => {
  state.wordCount = Number(event.target.value);
  buildWordList(state.wordCount);
});
elements.randomizeBtn.addEventListener('click', () => buildWordList(state.wordCount));
elements.restartBtn.addEventListener('click', () => buildWordList(state.wordCount));

window.addEventListener('resize', renderKeyboard);

buildWordList(state.wordCount);
setInterval(renderStats, 1000);
