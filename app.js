// Wordly SPA js file

(() => {
  const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

  // DOM elements
  const form = document.getElementById('search-form');
  const queryInput = document.getElementById('query');
  const status = document.getElementById('status-message');

  const wordEl = document.getElementById('word-placeholder');
  const pronunciationTextEl = document.getElementById('pronunciation-text');
  const audioContainer = document.getElementById('audio-container');
  const definitionsList = document.getElementById('definitions-list');
  const synonymsList = document.getElementById('synonyms-list');

  // Helper: clear results
  function clearResults() {
    wordEl.textContent = 'Word: -';
    pronunciationTextEl.textContent = '-';
    audioContainer.innerHTML = '';
    definitionsList.innerHTML = '';
    synonymsList.innerHTML = '';
    status.textContent = '';
  }

  // Helper: set status
  function setStatus(msg, isError = false) {
    status.textContent = msg;
    status.style.color = isError ? 'crimson' : '';
  }

  // Build and insert audio element (first available audio URL)
  function insertAudio(phonetics = []) {
    audioContainer.innerHTML = '';
    if (!Array.isArray(phonetics) || phonetics.length === 0) return;

    // Prefer phonetic objects with audio
    const audioUrl = phonetics.find(p => p.audio && p.audio.trim())?.audio
      || phonetics[0]?.audio || null;

    if (!audioUrl) return;

    // Some audio URLs returned by API may be relative or blank; use as-is if valid
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'none';
    audio.src = audioUrl;
    audioContainer.appendChild(audio);

    // Add a small "Play" button for quick playback (optional helpful UX)
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.textContent = 'Play';
    playBtn.style.marginLeft = '8px';
    playBtn.addEventListener('click', () => {
      audio.play().catch(() => {
        setStatus('Audio playback failed.', true);
      });
    });
    audioContainer.appendChild(playBtn);
  }

  // Populate definitions and synonyms
  function populateMeanings(meanings = []) {
    definitionsList.innerHTML = '';
    synonymsList.innerHTML = '';

    if (!Array.isArray(meanings) || meanings.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No definitions found.';
      definitionsList.appendChild(li);
      return;
    }

    const synonymsSet = new Set();

    meanings.forEach((meaning) => {
      const partOfSpeech = meaning.partOfSpeech || '';
      (meaning.definitions || []).forEach((defObj, idx) => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        if (partOfSpeech) strong.textContent = `${partOfSpeech}: `;
        // Definition text
        const defText = document.createTextNode(defObj.definition || '');
        li.appendChild(strong);
        li.appendChild(defText);

        // Example (if present)
        if (defObj.example) {
          const ex = document.createElement('div');
          ex.style.fontStyle = 'italic';
          ex.style.marginTop = '4px';
          ex.textContent = `Example: ${defObj.example}`;
          li.appendChild(ex);
        }

        definitionsList.appendChild(li);

        // Collect synonyms from definition-level or meaning-level
        (defObj.synonyms || []).forEach(s => synonymsSet.add(s));
      });

      (meaning.synonyms || []).forEach(s => synonymsSet.add(s));
    });

    // Render synonyms (limit to 20)
    if (synonymsSet.size > 0) {
      Array.from(synonymsSet).slice(0, 20).forEach(s => {
        const li = document.createElement('li');
        li.textContent = s;
        synonymsList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'No synonyms found.';
      synonymsList.appendChild(li);
    }
  }

  // Populate phonetic text (prefer phonetic or text fields)
  function populatePhonetics(phonetics = [], rootPhonetic) {
    let phoneticText = (rootPhonetic && rootPhonetic.trim()) || '-';
    if (Array.isArray(phonetics) && phonetics.length) {
      const textCandidate = phonetics.find(p => p.text && p.text.trim())?.text;
      if (textCandidate) phoneticText = textCandidate;
    }
    pronunciationTextEl.textContent = phoneticText;
  }

  // Main: fetch from API and render
  async function lookupWord(word) {
    if (!word) return;
    clearResults();
    setStatus('Searching...');

    try {
      const res = await fetch(API_BASE + encodeURIComponent(word));
      if (!res.ok) {
        if (res.status === 404) {
          setStatus('No entry found for that word.', true);
        } else {
          setStatus(`Error: ${res.status} ${res.statusText}`, true);
        }
        return;
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setStatus('No data returned.', true);
        return;
      }

      // The API returns an array of entries; prefer the first
      const entry = data[0];

      // Word
      const displayWord = entry.word || word;
      wordEl.textContent = `Word: ${displayWord}`;

      // Phonetics
      populatePhonetics(entry.phonetics || [], entry.phonetic || '');

      // Audio
      insertAudio(entry.phonetics || []);

      // Meanings -> definitions and synonyms
      populateMeanings(entry.meanings || []);

      setStatus(''); // clear status
    } catch (err) {
      setStatus('Network or parsing error.', true);
      console.error(err);
    }
  }

  // Form submit handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const word = queryInput.value.trim();
    if (!word) {
      setStatus('Please enter a word to search.', true);
      return;
    }
    lookupWord(word);
  });
  window.__dictionaryLookup = {
    lookupWord,
    clearResults,
  };
})();