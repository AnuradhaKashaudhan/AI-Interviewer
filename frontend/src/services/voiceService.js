// Voice service utilities for AI Interviewer
// Provides functions to select the preferred speech synthesis voice and basic speech actions.

/**
 * Returns the preferred SpeechSynthesisVoice based on a set of criteria.
 * Priority order (as per requirements):
 *   1. English (en-US) female professional voice if available.
 *   2. Voice name containing keywords like "Google", "Samantha", "Microsoft",
 *      "Natural", "Female", "Professional", "Recruiter".
 *   3. First available en-US voice.
 *   4. Fallback to the first voice in the list.
 *
 * @param {SpeechSynthesisVoice[]} voices - List of available voices from window.speechSynthesis.getVoices().
 * @returns {SpeechSynthesisVoice | undefined} The chosen voice or undefined if none are available.
 */
export function getPreferredVoice(voices = []) {
  if (!Array.isArray(voices) || voices.length === 0) return undefined;

  // Helper to test if a voice name includes any keyword (case‑insensitive).
  const hasKeyword = (voice, keyword) => voice.name.toLowerCase().includes(keyword.toLowerCase());

  // 1️⃣ Exact match: en‑US and name suggests a female voice.
  const femaleEnUs = voices.find(v => v.lang === 'en-US' && /female|woman|girl|samantha|catherine|ivy|angelica/i.test(v.name));
  if (femaleEnUs) return femaleEnUs;

  // 2️⃣ Keyword based priority list.
  const priorityKeywords = [
    'google',
    'samantha',
    'microsoft',
    'natural',
    'female',
    'professional',
    'recruiter',
    'voice',
    'english',
  ];
  for (const kw of priorityKeywords) {
    const match = voices.find(v => v.lang === 'en-US' && hasKeyword(v, kw));
    if (match) return match;
  }

  // 3️⃣ First en‑US voice.
  const firstEnUs = voices.find(v => v.lang === 'en-US');
  if (firstEnUs) return firstEnUs;

  // 4️⃣ Fallback to any available voice.
  return voices[0];
}

/** Placeholder: Speak text using the preferred voice */
export function speak(text, voices = []) {
  if (!('speechSynthesis' in window) || !text) return;
  const utter = new SpeechSynthesisUtterance(text);
  const voice = getPreferredVoice(voices);
  if (voice) utter.voice = voice;
  window.speechSynthesis.speak(utter);
}

/** Placeholder: Pause speech */
export function pauseSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.pause();
}

/** Placeholder: Resume speech */
export function resumeSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.resume();
}

/** Placeholder: Stop speech */
export function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
