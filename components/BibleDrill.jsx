"use client";

import RAW_DATA from "../lib/questions.json";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";



const PERIOD_COLORS = ["#FF6B6B","#FF8E53","#FFC93C","#6BCB77","#4D96FF","#845EC2","#FF9671","#00C9A7","#C34A36","#F9F871","#D65DB1","#0081CF","#00C9A7","#FF8066","#C4B7CB","#B39CD0","#FBEAFF"];
const PERIOD_EMOJIS = ["🌊","🚣","🌐","👨‍👩‍👧‍👦","🏃","🏜️","⚔️","⚖️","👑","🏛️","😢","⛓️","🏗️","🕊️","✝️","⛪","📜"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getLevel(section, question_code) {
  // Use question_code prefix as ground truth — some Period 17 entries
  // have section="Chronology" but are actually WS/NTP/NTB questions
  if (question_code) {
    const code = question_code.toUpperCase();
    if (/^GEO-A/.test(code)) return "GEO-A";
    if (/^GEO-B/.test(code)) return "GEO-B";
    if (/^GEO-C/.test(code)) return "GEO-C";
    if (/^PRO-A/.test(code)) return "PRO-A";
    if (/^PRO-B/.test(code)) return "PRO-B";
    if (/^PRO-C/.test(code)) return "PRO-C";
    if (/^WSIR/.test(code)) return "WSR";
    if (/^WS/.test(code)) return "WSR";
    if (/^NTP/.test(code)) return "NTP";
    if (/^NTB/.test(code)) return "NTB";
    if (/^CH/.test(code)) return "CH";
    if (/^A\d/.test(code)) return "A";
    if (/^B\d/.test(code)) return "B";
    if (/^C\d/.test(code)) return "C";
  }
  // Fallback to section string
  if (section.includes("A-Level")) return "A";
  if (section.includes("B-Level")) return "B";
  if (section.includes("C-Level")) return "C";
  if (section.includes("Who Said")) return "WSR";
  if (section.includes("Name That Person")) return "NTP";
  if (section.includes("Name That Book")) return "NTB";
  if (section.includes("Chronology")) return "CH";
  return "?";
}

function normalizeAnswer(ans) {
  return ans.toLowerCase()
    .replace(/,/g, " ")           // strip commas (Oxford comma differences)
    .replace(/[^a-z0-9]/g, " ")  // strip remaining non-alphanumeric
    .replace(/\s+/g, " ").trim();
}

function checkAnswer(userAns, correctAns) {
  const u = normalizeAnswer(userAns);
  const c = normalizeAnswer(correctAns);
  if (u === c) return true;
  if (c.includes(u) && u.length > 2) return true;
  if (u.includes(c) && c.length > 2) return true;
  const words = c.split(" ").filter(w => w.length > 3);
  return words.length > 0 && words.every(w => u.includes(w));
}

const BIBLE_PEOPLE = new Set(["adam","eve","cain","abel","seth","enoch","methuselah","noah","shem","ham","japheth","abram","abraham","sarai","sarah","lot","hagar","ishmael","isaac","rebekah","esau","jacob","israel","leah","rachel","joseph","judah","benjamin","moses","aaron","miriam","pharaoh","jethro","caleb","joshua","rahab","achan","deborah","barak","gideon","jephthah","samson","delilah","ruth","naomi","boaz","eli","samuel","saul","david","jonathan","goliath","bathsheba","nathan","absalom","solomon","rehoboam","jeroboam","elijah","elisha","jezebel","ahab","naaman","jonah","isaiah","jeremiah","ezekiel","daniel","shadrach","meshach","abednego","nebuchadnezzar","darius","cyrus","ezra","nehemiah","esther","mordecai","zerubbabel","john the baptist","mary","joseph","jesus","peter","james","john","andrew","philip","matthew","thomas","judas iscariot","paul","saul","barnabas","silas","timothy","stephen","cornelius","lydia","lazarus","nicodemus","pilate","herod","zacchaeus","martha","mary magdalene","matthias","ananias","sapphira"]);

const BIBLE_PLACES = new Set(["eden","ur","haran","canaan","egypt","sinai","midian","moab","edom","philistia","jericho","ai","gibeon","jerusalem","bethlehem","nazareth","hebron","samaria","babylon","nineveh","tyre","sidon","damascus","rome","athens","corinth","philippi","ephesus","antioch","caesarea","jordan","red sea","galilee","judea","israel","mount carmel","mount sinai","mount horeb","mount ebal","mount of olives","gethsemane","calvary","ararat","babel","sodom","gomorrah"]);

const BIBLE_BOOKS = new Set(["genesis","exodus","leviticus","numbers","deuteronomy","joshua","judges","ruth","i samuel","ii samuel","i kings","ii kings","i chronicles","ii chronicles","ezra","nehemiah","esther","job","psalms","proverbs","ecclesiastes","song of solomon","isaiah","jeremiah","lamentations","ezekiel","daniel","hosea","joel","amos","obadiah","jonah","micah","nahum","habakkuk","zephaniah","haggai","zechariah","malachi","matthew","mark","luke","john","acts","romans","i corinthians","ii corinthians","galatians","ephesians","philippians","colossians","i thessalonians","ii thessalonians","i timothy","ii timothy","titus","philemon","hebrews","james","i peter","ii peter","i john","ii john","iii john","jude","revelation"]);

const BIBLE_NUMBERS = new Set(["1","2","3","4","5","6","7","8","10","12","14","20","30","40","70","300","318","400","430","969"]);

function tagAnswer(ans) {
  const a = ans.toLowerCase().trim();
  const tags = new Set();

  if (BIBLE_BOOKS.has(a) || [...BIBLE_BOOKS].some(b => a === b || a === `the book of ${b}`)) tags.add("book");

  const personMatch = [...BIBLE_PEOPLE].some(p => {
    const words = a.split(/\s+/);
    return words.some(w => w === p) || a === p;
  });
  if (personMatch) tags.add("person");

  const placeMatch = [...BIBLE_PLACES].some(p => a.includes(p));
  if (placeMatch) tags.add("place");

  if (/^\d+$/.test(a.replace(/[,]/g,""))) tags.add("number-bare");
  if (/^\d+\s*(years?|days?|nights?|months?|times?)/.test(a)) tags.add("number-duration");
  if (/^(about\s+)?\d+\s+(years?|people|men|servants|sons|tribes?)/.test(a)) tags.add("number-count");

  if (/^(the\s+)?(a\s+)?(rainbow|ark|dove|raven|serpent|star|pillar|cloud|fire|stone|rod|staff|sword|harp|sling|fleece|scroll|seal|torch|trumpet|crown|cross|tomb|curtain)/.test(a)) tags.add("object");

  if (/^(the\s+)?(lord|god|jesus|holy spirit|an? angel|satan|the devil)$/.test(a)) tags.add("divine");

  if (/^(he|she|they|it)\s+(was|were|went|came|said|did|built|made|took|gave|killed|led|ate|prayed|walked|died|rose|fell|saw)/.test(a)) tags.add("action-phrase");

  if (a.startsWith("a ") || a.startsWith("an ") || a.startsWith("the ")) tags.add("noun-phrase");

  const wordCount = a.split(/\s+/).length;
  if (wordCount === 1) tags.add("len-1");
  else if (wordCount <= 3) tags.add("len-short");
  else if (wordCount <= 7) tags.add("len-medium");
  else tags.add("len-long");

  if (tags.size === 0 || (tags.size === 1 && (tags.has("len-1")||tags.has("len-short")||tags.has("len-medium")||tags.has("len-long")))) {
    tags.add("general");
  }

  return tags;
}

function scoreDistractorMatch(correctTags, candidateTags, correctSection, candidateSection, correctPeriod, candidatePeriod) {
  let score = 0;

  const meaningfulTags = ["book","person","place","number-bare","number-duration","number-count","object","divine","action-phrase","noun-phrase","general"];
  for (const t of meaningfulTags) {
    if (correctTags.has(t) && candidateTags.has(t)) score += 10;
  }

  const lenTags = ["len-1","len-short","len-medium","len-long"];
  for (const t of lenTags) {
    if (correctTags.has(t) && candidateTags.has(t)) score += 4;
  }

  if (correctSection === candidateSection) score += 6;
  else if (correctSection.replace(/[ABC]-Level/,"Level") === candidateSection.replace(/[ABC]-Level/,"Level")) score += 3;

  if (correctPeriod === candidatePeriod) score += 3;
  else if (Math.abs(correctPeriod - candidatePeriod) <= 2) score += 1;

  return score;
}

function getDistractors(question, allQuestions, count = 3) {
  const correctAns = question.answer_text_only;
  const correctNorm = normalizeAnswer(correctAns);
  const correctTags = tagAnswer(correctAns);
  const seen = new Set([correctNorm]);

  const candidates = [];
  for (const q of allQuestions) {
    if (q.db_id === question.db_id) continue;
    const a = q.answer_text_only;
    if (!a || a.length > 70) continue;
    const na = normalizeAnswer(a);
    if (seen.has(na)) continue;
    seen.add(na);
    const candidateTags = tagAnswer(a);
    const score = scoreDistractorMatch(
      correctTags, candidateTags,
      question.section, q.section,
      question.period_number, q.period_number
    );
    candidates.push({ a, score });
  }

  candidates.sort((a, b) => b.score - a.score);

  const topTier = candidates.filter(c => c.score >= candidates[0]?.score - 4);
  const picked = shuffle(topTier).slice(0, count);

  if (picked.length < count) {
    const rest = shuffle(candidates.slice(picked.length));
    for (const c of rest) {
      if (picked.length >= count) break;
      if (!picked.find(p => p.a === c.a)) picked.push(c);
    }
  }

  return picked.slice(0, count).map(c => c.a);
}

function Confetti({ active }) {
  const colors = ["#FF6B6B","#FFC93C","#6BCB77","#4D96FF","#FF8E53","#845EC2"];
  if (!active) return null;
  return (
    <div style={{ position:"fixed", top:0, left:0, width:"100%", height:"100%", pointerEvents:"none", overflow:"hidden", zIndex:9999 }}>
      {Array.from({length:40}).map((_,i) => (
        <div key={i} style={{
          position:"absolute",
          left:`${Math.random()*100}%`,
          top:`-10px`,
          width:`${6+Math.random()*8}px`,
          height:`${6+Math.random()*8}px`,
          borderRadius: Math.random()>0.5?"50%":"2px",
          background: colors[i%colors.length],
          animation:`fall ${1+Math.random()*2}s linear ${Math.random()*0.5}s forwards`,
        }}/>
      ))}
      <style>{`@keyframes fall{to{transform:translateY(110vh) rotate(720deg);opacity:0}}`}</style>
    </div>
  );
}

function ProgressBar({ value, max, color="#4D96FF" }) {
  const pct = max > 0 ? Math.round((value/max)*100) : 0;
  return (
    <div style={{ background:"#e8e8e8", borderRadius:99, height:10, overflow:"hidden" }}>
      <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:99, transition:"width 0.4s ease" }}/>
    </div>
  );
}

function TimerRing({ seconds, max }) {
  const pct = seconds / max;
  const r = 34, c = 2*Math.PI*r;
  const color = seconds <= 3 ? "#FF6B6B" : seconds <= 6 ? "#FFC93C" : "#6BCB77";
  return (
    <svg width={88} height={88} viewBox="0 0 88 88">
      <circle cx={44} cy={44} r={r} fill="none" stroke="#e8e8e8" strokeWidth={6}/>
      <circle cx={44} cy={44} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={c} strokeDashoffset={c*(1-pct)}
        strokeLinecap="round" transform="rotate(-90 44 44)"
        style={{transition:"stroke-dashoffset 1s linear, stroke 0.3s"}}/>
      <text x={44} y={52} textAnchor="middle" fontSize={26} fontWeight="800" fill={color}>{seconds}</text>
    </svg>
  );
}

export default function BibleDrill() {
  const [screen, setScreen] = useState("home");
  const [gameMode, setGameMode] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showResult, setShowResult] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [freeInput, setFreeInput] = useState("");
  const [timer, setTimer] = useState(10);
  const [confetti, setConfetti] = useState(false);
  const [progress, setProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bdProgress")||"{}"); } catch { return {}; }
  });
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState("A");
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(10);
  const [studyIndex, setStudyIndex] = useState(0);
  const [studyFlipped, setStudyFlipped] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [studyNeeded, setStudyNeeded] = useState([]);
  const [jeopardyScores, setJeopardyScores] = useState({});
  const [jeopardyQ, setJeopardyQ] = useState(null);
  const [missedIds, setMissedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("bdMissed")||"[]")); } catch { return new Set(); }
  });
  const timerRef = useRef(null);
  const questionsRef = useRef([]);
  const qIndexRef = useRef(0);
  const [aiDistractorCache, setAiDistractorCache] = useState({});
  const [leaderboard, setLeaderboard] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bdLeaderboard")||"[]"); } catch { return []; }
  });
  const [playerName, setPlayerName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const fetchingRef = useRef(new Set());
  // Hot Seat state
  const [hotSeatPlayers, setHotSeatPlayers] = useState([]);
  const [hotSeatScores, setHotSeatScores] = useState({});
  const [hotSeatCorrect, setHotSeatCorrect] = useState({});
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [hotSeatSetupNames, setHotSeatSetupNames] = useState(["", ""]);
  // Public leaderboard state
  const [publicBoard, setPublicBoard] = useState([]);
  const [publicBoardLoading, setPublicBoardLoading] = useState(false);
  const [publicBoardError, setPublicBoardError] = useState(null);
  const [showPublicBoard, setShowPublicBoard] = useState(false);
  const [publicSubmitted, setPublicSubmitted] = useState(false);
  const [publicSubmitting, setPublicSubmitting] = useState(false);

  const playSound = useCallback((type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      if (type === "correct") {
        o.frequency.setValueAtTime(523, ctx.currentTime);
        o.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        o.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        g.gain.setValueAtTime(0.3, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        o.start(); o.stop(ctx.currentTime + 0.5);
      } else if (type === "wrong") {
        o.type = "sawtooth";
        o.frequency.setValueAtTime(200, ctx.currentTime);
        o.frequency.setValueAtTime(150, ctx.currentTime + 0.15);
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        o.start(); o.stop(ctx.currentTime + 0.4);
      } else if (type === "streak") {
        [523,659,784,1047].forEach((f, i) => {
          const o2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.frequency.value = f;
          g2.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.08);
          g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.3);
          o2.start(ctx.currentTime + i * 0.08);
          o2.stop(ctx.currentTime + i * 0.08 + 0.3);
        });
      } else if (type === "tick") {
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.08, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        o.start(); o.stop(ctx.currentTime + 0.05);
      }
    } catch(e) {}
  }, []);

  const allQuestions = RAW_DATA;
  const periods = [...new Set(allQuestions.map(q => q.period_number))].sort((a,b)=>a-b);
  const currentQ = questions[qIndex];

  const saveProgress = useCallback((newProg) => {
    setProgress(newProg);
    localStorage.setItem("bdProgress", JSON.stringify(newProg));
  }, []);

  const saveMissed = useCallback((ids) => {
    setMissedIds(ids);
    localStorage.setItem("bdMissed", JSON.stringify([...ids]));
  }, []);

  const saveScore = useCallback((name, sc, mode) => {
    const entry = { name: name.trim() || "Anonymous", score: sc, mode, date: new Date().toLocaleDateString(), ts: Date.now() };
    const updated = [...leaderboard, entry].sort((a,b)=>b.score-a.score).slice(0,20);
    setLeaderboard(updated);
    localStorage.setItem("bdLeaderboard", JSON.stringify(updated));
  }, [leaderboard]);

  const fetchAIDistractors = useCallback(async (q) => {
    const cacheKey = q.db_id;
    if (aiDistractorCache[cacheKey] || fetchingRef.current.has(cacheKey)) return;
    fetchingRef.current.add(cacheKey);

    const levelLabel = getLevel(q.section, q.question_code);
    const prompt = `You are an expert Bible educator and assessment designer for children ages 8-12.

Generate exactly 3 incorrect but believable multiple choice distractors for this Bible Drill question.

RULES:
- All distractors must be the SAME TYPE as the correct answer (if correct answer is a person, all distractors are people; if a place, all places; if a number, all numbers; etc.)
- Distractors must be plausible - things a child might reasonably guess
- Distractors must be clearly wrong (do not introduce theological confusion)
- Keep distractors concise - similar length to the correct answer
- Do NOT repeat the correct answer or any variation of it
- Do NOT use silly or obviously wrong answers
- Use same-story figures/places first, then broader Bible context
- Difficulty level: ${levelLabel === 'A' ? 'Easy (basic same-category confusion)' : levelLabel === 'B' ? 'Medium (same story or similar figures)' : 'Hard (close contextual confusion)'}

Question: ${q.question_text}
Correct Answer: ${q.answer_text_only}
Bible Reference: ${q.bible_reference || 'N/A'}
Period: ${q.period_name}
Section: ${q.section}

Respond with ONLY a JSON array of exactly 3 strings, no explanation:
["distractor1", "distractor2", "distractor3"]`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await response.json();
      const text = data.content?.map(c => c.text || "").join("") || "[]";
      const match = text.match(/\[[\s\S]*?\]/);
      if (match) {
        const distractors = JSON.parse(match[0]);
        if (Array.isArray(distractors) && distractors.length === 3) {
          setAiDistractorCache(prev => ({ ...prev, [cacheKey]: distractors }));
        }
      }
    } catch (e) {
      // silently fall back to algorithmic distractors
    } finally {
      fetchingRef.current.delete(cacheKey);
    }
  }, [aiDistractorCache]);

  const startGame = (mode, opts = {}) => {
    clearInterval(timerRef.current);
    lockedOptionsRef.current = {}; // clear locked options from previous game
    seenQuestionsRef.current = new Set(); // reset seen questions
    setHintUsed(false);
    setHintVisible(false);
    setCurrentPlayerIdx(0);
    setPublicSubmitted(false);
    let pool = allQuestions;
    // Filter duplicates when playing All Periods (keep them for single-period play)
    if (!opts.period && !opts.missed) pool = pool.filter(q => !q.is_duplicate);
    if (opts.period === "geo") pool = pool.filter(q => q.period_name === "Geography");
    else if (opts.period === "pro") pool = pool.filter(q => q.period_name === "Prophets");
    else if (opts.period) pool = pool.filter(q => q.period_number === opts.period);
    if (opts.level) {
      pool = pool.filter(q => getLevel(q.section, q.question_code) === opts.level);
      // Some CH-coded questions are factual (not "which came first") — exclude them
      if (opts.level === "CH") {
        pool = pool.filter(q => /which (happened|came|was written) first/i.test(q.question_text));
      }
    }
    if (opts.missed) pool = pool.filter(q => missedIds.has(q.db_id));
    if (opts.daily) {
      const seed = new Date().toDateString();
      let h = 0; for (const c of seed) h = (h*31+c.charCodeAt(0))&0xfffffff;
      const arr = [...pool]; for (let i=arr.length-1;i>0;i--){const j=(h*i)%i;[arr[i],arr[j]]=[arr[j],arr[i]]}
      pool = arr.slice(0,10);
    }
    if (pool.length === 0) { alert("No questions found for that selection!"); return; }
    const count = opts.count || selectedQuestionCount || 10;
    // Smart shuffle: prioritize unseen questions first
    const seen = seenQuestionsRef.current;
    const unseen = pool.filter(q => !seen.has(q.db_id));
    const seenPool = pool.filter(q => seen.has(q.db_id));
    const orderedPool = [...shuffle(unseen), ...shuffle(seenPool)];
    const qs = orderedPool.slice(0, Math.min(count, orderedPool.length));
    setQuestions(qs);
    setQIndex(0);
    setScore(0);
    setStreak(0);
    setShowResult(null);
    setSelectedOption(null);
    setFreeInput("");
    setGameMode(mode);
    setScreen("game");
    if (mode === "speed") setTimer(10);
  };

  const handleAnswer = useCallback((userAnswer, isCorrect, fast = false) => {
    clearInterval(timerRef.current);
    const q = questions[qIndex];
    const newMissed = new Set(missedIds);

    if (isCorrect) {
      const pts = 10 + (fast ? 5 : 0);
      const newStreak = streak + 1;
      setScore(s => s + pts);
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      if (newStreak > 0 && newStreak % 3 === 0) { setConfetti(true); setTimeout(() => setConfetti(false), 2500); playSound("streak"); }
      else { playSound("correct"); }
      newMissed.delete(q.db_id);
      const key = `${q.period_number}-${getLevel(q.section, q.question_code)}`;
      const newProg = { ...progress, [key]: (progress[key]||0)+1 };
      saveProgress(newProg);
    } else {
      setStreak(0);
      newMissed.add(q.db_id);
      playSound("wrong");
    }
    saveMissed(newMissed);
    setShowResult({ correct: isCorrect, answer: q.answer_text_only, ref: q.bible_reference, original: q.original_answer, speedBonus: fast });

    // Hot Seat: update this player's score and correct count
    if (gameMode === "hotseat" && hotSeatPlayers.length > 0) {
      const pName = hotSeatPlayers[currentPlayerIdx];
      const pts = isCorrect ? 10 + (fast ? 5 : 0) : 0;
      setHotSeatScores(prev => ({ ...prev, [pName]: (prev[pName]||0) + pts }));
      if (isCorrect) setHotSeatCorrect(prev => ({ ...prev, [pName]: (prev[pName]||0) + 1 }));
    }
  }, [questions, qIndex, streak, bestStreak, progress, missedIds, saveProgress, saveMissed, gameMode, hotSeatPlayers, currentPlayerIdx]);

    const fetchPublicBoard = async () => {
    setPublicBoardLoading(true);
    setPublicBoardError(null);
    try {
      const res = await fetch("/api/scores");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPublicBoard(data);
    } catch (e) {
      setPublicBoardError("Could not load scores. Check your connection.");
    } finally {
      setPublicBoardLoading(false);
    }
  };

  const submitPublicScore = async (name, sc, mode, qCount, correctCount) => {
    setPublicSubmitting(true);
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_name: name, score: sc, game_mode: mode, question_count: qCount, correct_count: correctCount }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPublicSubmitted(true);
    } catch (e) {
      setPublicBoardError("Could not submit score. Try again.");
    } finally {
      setPublicSubmitting(false);
    }
  };

  // Hot Seat helpers
  const currentPlayer = hotSeatPlayers[currentPlayerIdx] || null;
  const isHotSeat = gameMode === "hotseat";

const aiReady = !currentQ || !!aiDistractorCache[currentQ.db_id];

  useEffect(() => {
    if (screen === "game" && gameMode === "speed" && showResult === null && currentQ) {
      setTimer(10);
      timerRef.current = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            const curIdx = qIndexRef.current;
            const qs = questionsRef.current;
            setStreak(0);
            const q = qs[curIdx];
            if (q) {
              setMissedIds(prev => { const n = new Set(prev); n.add(q.db_id); localStorage.setItem("bdMissed", JSON.stringify([...n])); return n; });
            }
            setShowResult({ correct: false, answer: q?.answer_text_only || "", ref: q?.bible_reference || "", original: q?.original_answer || "" });
            playSound("wrong");
            return 0;
          }
          if (t <= 5) playSound("tick");
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [screen, gameMode, qIndex, showResult, currentQ]);

  const nextQuestion = () => {
    clearInterval(timerRef.current); // safety: clear any running timer
    if (currentQ) seenQuestionsRef.current.add(currentQ.db_id);
    setShowResult(null);
    setSelectedOption(null);
    setFreeInput("");
    setHintVisible(false);
    // Hot Seat: rotate to next player
    if (gameMode === "hotseat" && hotSeatPlayers.length > 0) {
      setCurrentPlayerIdx(i => (i + 1) % hotSeatPlayers.length);
    }
    if (qIndex + 1 >= questions.length) {
      setScreen("results");
    } else {
      setQIndex(i => i + 1);
    }
  };

  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);

  const lockedOptionsRef = useRef({});
  const seenQuestionsRef = useRef(new Set()); // tracks db_ids seen this session
  const gameOptions = useMemo(() => {
    if (!currentQ) return [];
    const key = currentQ.db_id;
    if (lockedOptionsRef.current[key]) return lockedOptionsRef.current[key];
    const aiDistractors = aiDistractorCache[key];
    const distractors = (aiDistractors && aiDistractors.length === 3)
      ? aiDistractors
      : getDistractors(currentQ, allQuestions);
    const uniqueDistractors = distractors
      .filter(d => normalizeAnswer(d) !== normalizeAnswer(currentQ.answer_text_only))
      .slice(0, 3);
    const opts = shuffle([currentQ.answer_text_only, ...uniqueDistractors]);
    lockedOptionsRef.current[key] = opts;
    return opts;
  }, [currentQ?.db_id]);

  useEffect(() => {
    if (!currentQ) return;
    if (gameMode === "multiple" || gameMode === "speed") {
      fetchAIDistractors(currentQ);
      const next = questions[qIndex + 1];
      if (next) fetchAIDistractors(next);
    }
  }, [currentQ?.db_id, gameMode]);

  const periodStats = (pn) => {
    const pqs = allQuestions.filter(q => q.period_number === pn);
    const total = pqs.length;
    const done = pqs.filter(q => {
      const key = `${q.period_number}-${getLevel(q.section, q.question_code)}`;
      return (progress[key]||0) > 0;
    }).length;
    return { total, done };
  };

  if (screen === "home" && showLeaderboard) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", fontFamily:"'Nunito',sans-serif", color:"#fff", padding:24 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap" rel="stylesheet"/>
      <div style={{ maxWidth:520, margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <button onClick={() => setShowLeaderboard(false)} style={{ background:"transparent", border:"none", color:"#a0c4ff", cursor:"pointer", fontSize:16 }}>← Back</button>
          <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, margin:0, color:"#FFC93C" }}>🏆 Leaderboard</h2>
        </div>
        <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:16, overflow:"hidden" }}>
          {leaderboard.length === 0 ? (
            <div style={{ padding:40, textAlign:"center", color:"#a0c4ff" }}>No scores yet — finish a game to appear here!</div>
          ) : leaderboard.map((entry, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,0.06)", background: i===0?"rgba(255,199,60,0.1)":i===1?"rgba(255,255,255,0.04)":i===2?"rgba(255,142,83,0.07)":"transparent" }}>
              <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, width:36, color: i===0?"#FFC93C":i===1?"#a0c4ff":i===2?"#FF8E53":"#555" }}>
                {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`}
              </span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:16 }}>{entry.name}</div>
                <div style={{ fontSize:11, color:"#a0c4ff" }}>{entry.mode} · {entry.date}</div>
              </div>
              <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:24, color:"#FFC93C" }}>{entry.score}</span>
            </div>
          ))}
        </div>
        <button onClick={() => { setLeaderboard([]); localStorage.removeItem("bdLeaderboard"); }}
          style={{ marginTop:12, width:"100%", padding:"10px", background:"transparent", border:"1px solid rgba(255,107,107,0.3)", borderRadius:12, color:"#FF6B6B", cursor:"pointer", fontSize:13 }}>
          Clear Leaderboard
        </button>
      </div>
    </div>
  );

  if (screen === "home") return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)", fontFamily:"'Nunito',sans-serif", color:"#fff", padding:"0 0 40px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap" rel="stylesheet"/>
      <Confetti active={confetti}/>
      <div style={{ maxWidth:900, margin:"0 auto", padding:"0 16px" }}>
        <div style={{ textAlign:"center", padding:"40px 0 24px" }}>
          <div style={{ fontSize:56 }}>✝️</div>
          <h1 style={{ fontFamily:"'Fredoka One',cursive", fontSize:"clamp(2rem,6vw,3.5rem)", margin:"8px 0 4px", color:"#FFC93C", textShadow:"2px 2px 0 rgba(0,0,0,0.3)" }}>
            Bowling Green Bible Drill
          </h1>
          <p style={{ color:"#a0c4ff", fontSize:16, margin:0 }}>Learning from all 17 Bible periods · 1,200+ questions</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:16, marginBottom:24 }}>
          {[
            { mode:"multiple", icon:"🎯", label:"Multiple Choice", desc:"4 options, pick the right one!", color:"#FF6B6B" },
            { mode:"hotseat", icon:"👨‍👩‍👧‍👦", label:"Hot Seat", desc:"2–6 players take turns!", color:"#00C9A7" },
            { mode:"free", icon:"✏️", label:"Free Response", desc:"Type your answer from memory", color:"#4D96FF" },
            { mode:"speed", icon:"⚡", label:"Speed Drill", desc:"10 seconds per question!", color:"#FFC93C" },
            { mode:"study", icon:"📖", label:"Study Mode", desc:"Browse and flip flashcards", color:"#6BCB77" },
            { mode:"jeopardy", icon:"🏆", label:"Jeopardy", desc:"Category board, earn points!", color:"#845EC2" },
            { mode:"missed", icon:"🔄", label:"Review Missed", desc:"Practice questions you got wrong", color:"#FF8E53" },
          ].map(m => (
            <button key={m.mode} onClick={() => {
              if (m.mode === "study") { setScreen("studySetup"); return; }
              if (m.mode === "jeopardy") { setScreen("jeopardy"); setJeopardyScores({}); setJeopardyQ(null); return; }
              if (m.mode === "missed") { startGame("multiple", {missed:true}); return; }
              setScreen("setup"); setGameMode(m.mode);
            }}
              style={{ background:"rgba(255,255,255,0.08)", border:`2px solid ${m.color}33`, borderRadius:16, padding:"20px 16px", cursor:"pointer", color:"#fff", textAlign:"left", transition:"all 0.2s" }}
              onMouseOver={e => { e.currentTarget.style.background=`${m.color}22`; e.currentTarget.style.transform="translateY(-3px)"; }}
              onMouseOut={e => { e.currentTarget.style.background="rgba(255,255,255,0.08)"; e.currentTarget.style.transform=""; }}>
              <div style={{ fontSize:32, marginBottom:8 }}>{m.icon}</div>
              <div style={{ fontWeight:800, fontSize:18, color:m.color }}>{m.label}</div>
              <div style={{ color:"#a0c4ff", fontSize:13, marginTop:4 }}>{m.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:16, padding:20, marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, margin:0, color:"#FFC93C" }}>📊 Your Progress</h2>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => startGame("multiple", {daily:true})}
                style={{ background:"#FFC93C", border:"none", borderRadius:10, padding:"8px 14px", fontWeight:800, cursor:"pointer", color:"#1a1a2e", fontSize:14 }}>
                ⭐ Daily Quiz
              </button>
              <button onClick={() => setShowLeaderboard(true)}
                style={{ background:"rgba(255,255,255,0.1)", border:"2px solid rgba(255,199,60,0.3)", borderRadius:10, padding:"8px 14px", fontWeight:800, cursor:"pointer", color:"#FFC93C", fontSize:14 }}>
                🏆 Scores
              </button>
              <button onClick={() => { setShowPublicBoard(true); fetchPublicBoard(); }}
                style={{ background:"rgba(77,150,255,0.1)", border:"2px solid rgba(77,150,255,0.3)", borderRadius:10, padding:"8px 14px", fontWeight:800, cursor:"pointer", color:"#4D96FF", fontSize:14 }}>
                🌍 World
              </button>
            </div>
          </div>
          <div style={{ display:"grid", gap:10 }}>
            {periods.map(pn => {
              const pname = allQuestions.find(q=>q.period_number===pn)?.period_name || "";
              const {done,total} = periodStats(pn);
              const pct = total>0?Math.round(done/total*100):0;
              const emoji = PERIOD_EMOJIS[pn-1]||"📖";
              const col = PERIOD_COLORS[pn-1]||"#4D96FF";
              return (
                <div key={pn} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:28, textAlign:"center", fontSize:16 }}>{emoji}</div>
                  <div style={{ width:120, fontSize:12, color:"#a0c4ff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>P{pn}: {pname}</div>
                  <div style={{ flex:1 }}><ProgressBar value={done} max={total} color={col}/></div>
                  <div style={{ width:36, textAlign:"right", fontSize:12, color:"#a0c4ff" }}>{pct}%</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:16, display:"flex", gap:16, flexWrap:"wrap" }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:"#FFC93C" }}>{score}</div>
              <div style={{ fontSize:12, color:"#a0c4ff" }}>Session Score</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:"#FF6B6B" }}>{bestStreak}</div>
              <div style={{ fontSize:12, color:"#a0c4ff" }}>Best Streak</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:"#6BCB77" }}>{missedIds.size}</div>
              <div style={{ fontSize:12, color:"#a0c4ff" }}>To Review</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── PUBLIC LEADERBOARD SCREEN ──
  if (showPublicBoard) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", fontFamily:"'Nunito',sans-serif", color:"#fff", padding:24 }}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <button onClick={() => setShowPublicBoard(false)} style={{ background:"transparent", border:"none", color:"#a0c4ff", cursor:"pointer", fontSize:16 }}>← Back</button>
          <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, margin:0, color:"#4D96FF" }}>🌍 World Leaderboard</h2>
          <button onClick={fetchPublicBoard} style={{ marginLeft:"auto", background:"rgba(77,150,255,0.15)", border:"1px solid rgba(77,150,255,0.3)", borderRadius:20, padding:"6px 14px", color:"#4D96FF", fontWeight:700, fontSize:12, cursor:"pointer" }}>🔄 Refresh</button>
        </div>
        {publicBoardError && <div style={{ background:"rgba(255,107,107,0.15)", border:"1px solid rgba(255,107,107,0.3)", borderRadius:12, padding:"10px 16px", color:"#FF6B6B", marginBottom:16, fontSize:14 }}>{publicBoardError}</div>}
        {publicBoardLoading ? (
          <div style={{ textAlign:"center", padding:40, color:"#a0c4ff" }}>Loading scores...</div>
        ) : (
          <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:16, overflow:"hidden", marginBottom:16 }}>
            {publicBoard.length === 0 ? (
              <div style={{ padding:32, textAlign:"center", color:"#a0c4ff" }}>No scores yet — be the first!</div>
            ) : publicBoard.map((entry, i) => {
              const modeLabel = entry.game_mode==="multiple"?"Multiple Choice":entry.game_mode==="speed"?"Speed Drill":entry.game_mode==="free"?"Free Response":entry.game_mode==="hotseat"?"Hot Seat":entry.game_mode;
              const date = new Date(entry.created_at).toLocaleDateString();
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)", background:i===0?"rgba(255,199,60,0.08)":i===1?"rgba(255,255,255,0.04)":i===2?"rgba(255,142,83,0.06)":"transparent" }}>
                  <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:20, width:32, color:i===0?"#FFC93C":i===1?"#C0C0C0":i===2?"#CD7F32":"#555", flexShrink:0 }}>
                    {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`}
                  </span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:15, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{entry.player_name}</div>
                    <div style={{ fontSize:11, color:"#a0c4ff" }}>{modeLabel} · {entry.correct_count}/{entry.question_count} correct · {date}</div>
                  </div>
                  <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:"#FFC93C", flexShrink:0 }}>{entry.score}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── HOT SEAT SETUP SCREEN ──
  if (screen === "hotSeatSetup") return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", fontFamily:"'Nunito',sans-serif", color:"#fff", padding:24 }}>
      <div style={{ maxWidth:520, margin:"0 auto" }}>
        <button onClick={() => setScreen("home")} style={{ background:"transparent", border:"none", color:"#a0c4ff", cursor:"pointer", fontSize:16, padding:"8px 0", marginBottom:16 }}>← Back</button>
        <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:"#00C9A7", marginBottom:6 }}>👨‍👩‍👧‍👦 Hot Seat</h2>
        <p style={{ color:"#a0c4ff", fontSize:14, marginBottom:24 }}>Players take turns answering. Enter 2–6 names to get started.</p>
        <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:16, padding:20, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#a0c4ff", marginBottom:12, textTransform:"uppercase", letterSpacing:1 }}>Player Names</div>
          {hotSeatSetupNames.map((name, i) => (
            <div key={i} style={{ display:"flex", gap:8, marginBottom:10, alignItems:"center" }}>
              <span style={{ color:"#00C9A7", fontWeight:800, fontSize:16, width:28, flexShrink:0 }}>P{i+1}</span>
              <input value={name} onChange={e => { const u=[...hotSeatSetupNames]; u[i]=e.target.value; setHotSeatSetupNames(u); }}
                placeholder={`Player ${i+1} name...`} maxLength={20}
                style={{ flex:1, padding:"10px 14px", borderRadius:10, border:"2px solid rgba(0,201,167,0.3)", background:"rgba(255,255,255,0.07)", color:"#fff", fontSize:14, fontFamily:"'Nunito',sans-serif", outline:"none" }}/>
              {i >= 2 && (
                <button onClick={() => setHotSeatSetupNames(prev => prev.filter((_,j)=>j!==i))}
                  style={{ background:"rgba(255,107,107,0.15)", border:"none", borderRadius:8, padding:"8px 12px", color:"#FF6B6B", cursor:"pointer", fontSize:16 }}>✕</button>
              )}
            </div>
          ))}
          {hotSeatSetupNames.length < 6 && (
            <button onClick={() => setHotSeatSetupNames(prev=>[...prev,""])}
              style={{ width:"100%", padding:"10px", background:"rgba(0,201,167,0.1)", border:"2px dashed rgba(0,201,167,0.3)", borderRadius:12, color:"#00C9A7", fontWeight:700, cursor:"pointer", fontSize:14, marginTop:4 }}>
              + Add Player
            </button>
          )}
        </div>
        <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:16, padding:20, marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#a0c4ff", marginBottom:12, textTransform:"uppercase", letterSpacing:1 }}>Questions Per Game</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[10,20,30].map(n => (
              <button key={n} onClick={() => setSelectedQuestionCount(n)}
                style={{ padding:"8px 18px", borderRadius:20, border:`2px solid ${selectedQuestionCount===n?"#00C9A7":"#ffffff22"}`, background:selectedQuestionCount===n?"rgba(0,201,167,0.15)":"transparent", color:selectedQuestionCount===n?"#00C9A7":"#a0c4ff", cursor:"pointer", fontSize:13, fontWeight:700 }}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => {
            const validNames = hotSeatSetupNames.map(n=>n.trim()).filter(n=>n.length>0);
            if (validNames.length < 2) { alert("Please enter at least 2 player names."); return; }
            const initScores={}, initCorrect={};
            validNames.forEach(n => { initScores[n]=0; initCorrect[n]=0; });
            setHotSeatPlayers(validNames);
            setHotSeatScores(initScores);
            setHotSeatCorrect(initCorrect);
            setCurrentPlayerIdx(0);
            startGame("hotseat", { count: selectedQuestionCount });
          }}
          style={{ width:"100%", padding:"16px", background:"linear-gradient(90deg,#00C9A7,#4D96FF)", border:"none", borderRadius:16, color:"#fff", fontFamily:"'Fredoka One',cursive", fontSize:22, cursor:"pointer", letterSpacing:1 }}>
          Start Hot Seat! 🎉
        </button>
      </div>
    </div>
  );

  if (screen === "setup") return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", fontFamily:"'Nunito',sans-serif", color:"#fff", padding:24 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap" rel="stylesheet"/>
      <div style={{ maxWidth:600, margin:"0 auto" }}>
        <button onClick={() => setScreen("home")} style={{ background:"transparent", border:"none", color:"#a0c4ff", cursor:"pointer", fontSize:16, padding:"8px 0", marginBottom:16 }}>← Back</button>
        <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:"#FFC93C", marginBottom:8 }}>Choose Your Questions</h2>

        <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:16, padding:20, marginBottom:16 }}>
          <h3 style={{ color:"#a0c4ff", fontSize:14, fontWeight:600, marginBottom:12, textTransform:"uppercase", letterSpacing:1 }}>Filter by Period</h3>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            <button onClick={() => setSelectedPeriod(null)}
              style={{ padding:"6px 14px", borderRadius:20, border:`2px solid ${!selectedPeriod?"#FFC93C":"#ffffff22"}`, background: !selectedPeriod?"#FFC93C22":"transparent", color: !selectedPeriod?"#FFC93C":"#a0c4ff", cursor:"pointer", fontSize:13, fontWeight:700 }}>
              All Periods
            </button>
            {periods.map(pn => (
              <button key={pn} onClick={() => setSelectedPeriod(pn)}
                style={{ padding:"6px 14px", borderRadius:20, border:`2px solid ${selectedPeriod===pn?PERIOD_COLORS[pn-1]:"#ffffff22"}`, background: selectedPeriod===pn?`${PERIOD_COLORS[pn-1]}22`:"transparent", color: selectedPeriod===pn?PERIOD_COLORS[pn-1]:"#a0c4ff", cursor:"pointer", fontSize:12, fontWeight:700 }}>
                {PERIOD_EMOJIS[pn-1]} {allQuestions.find(q=>q.period_number===pn)?.period_name||""}
              </button>
            ))}
            <button onClick={() => setSelectedPeriod("geo")}
              style={{ padding:"6px 14px", borderRadius:20, border:`2px solid ${selectedPeriod==="geo"?"#FFB347":"#ffffff22"}`, background: selectedPeriod==="geo"?"rgba(255,179,71,0.15)":"transparent", color: selectedPeriod==="geo"?"#FFB347":"#a0c4ff", cursor:"pointer", fontSize:12, fontWeight:700 }}>
              🗺️ Geography
            </button>
            <button onClick={() => setSelectedPeriod("pro")}
              style={{ padding:"6px 14px", borderRadius:20, border:`2px solid ${selectedPeriod==="pro"?"#FF6B9D":"#ffffff22"}`, background: selectedPeriod==="pro"?"rgba(255,107,157,0.15)":"transparent", color: selectedPeriod==="pro"?"#FF6B9D":"#a0c4ff", cursor:"pointer", fontSize:12, fontWeight:700 }}>
              📜 Prophets
            </button>
          </div>
        </div>

        <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:16, padding:20, marginBottom:24 }}>
          <h3 style={{ color:"#a0c4ff", fontSize:14, fontWeight:600, marginBottom:12, textTransform:"uppercase", letterSpacing:1 }}>Filter by Level</h3>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {[["All","All levels"],["A","A-Level (Easiest)"],["B","B-Level (Medium)"],["C","C-Level (Hard)"],["WSR","Who Said It"],["NTP","Name That Person"],["NTB","Name That Book"],["CH","Chronology"],["GEO-A","Geography A - Easy"],["GEO-B","Geography B - Medium"],["GEO-C","Geography C - Hard"],["PRO-A","Prophets A - Easy"],["PRO-B","Prophets B - Medium"],["PRO-C","Prophets C - Hard"]].map(([lv,lb]) => (
              <button key={lv} onClick={() => setSelectedLevel(lv)}
                style={{ padding:"6px 14px", borderRadius:20, border:`2px solid ${selectedLevel===lv?"#6BCB77":"#ffffff22"}`, background: selectedLevel===lv?"#6BCB7722":"transparent", color: selectedLevel===lv?"#6BCB77":"#a0c4ff", cursor:"pointer", fontSize:12, fontWeight:700 }}>
                {lb}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:16, padding:20, marginBottom:24 }}>
          <h3 style={{ color:"#a0c4ff", fontSize:14, fontWeight:600, marginBottom:12, textTransform:"uppercase", letterSpacing:1 }}>Number of Questions</h3>
          <div style={{ display:"flex", gap:12 }}>
            {[10, 20, 30].map(n => (
              <button key={n} onClick={() => setSelectedQuestionCount(n)}
                style={{ flex:1, padding:"14px 0", borderRadius:14, border:`2px solid ${selectedQuestionCount===n?"#FF8E53":"#ffffff22"}`, background: selectedQuestionCount===n?"#FF8E5322":"transparent", color: selectedQuestionCount===n?"#FF8E53":"#a0c4ff", cursor:"pointer", fontFamily:"'Fredoka One',cursive", fontSize:24, fontWeight:700, transition:"all 0.15s" }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => startGame(gameMode, { period: selectedPeriod, level: selectedLevel==="All"?null:selectedLevel, count: selectedQuestionCount })}
          style={{ width:"100%", padding:"16px", background:"linear-gradient(90deg,#4D96FF,#845EC2)", border:"none", borderRadius:16, color:"#fff", fontFamily:"'Fredoka One',cursive", fontSize:24, cursor:"pointer", letterSpacing:1, boxShadow:"0 4px 20px rgba(77,150,255,0.4)" }}>
          Start Game! 🚀
        </button>
      </div>
    </div>
  );

  if (screen === "studySetup") return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", fontFamily:"'Nunito',sans-serif", color:"#fff", padding:24 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap" rel="stylesheet"/>
      <div style={{ maxWidth:600, margin:"0 auto" }}>
        <button onClick={() => setScreen("home")} style={{ background:"transparent", border:"none", color:"#a0c4ff", cursor:"pointer", fontSize:16, padding:"8px 0", marginBottom:16 }}>← Back</button>
        <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:"#6BCB77", marginBottom:20 }}>📖 Study Mode</h2>

        {/* Number of cards selector */}
        <div style={{ marginBottom:24, background:"rgba(255,255,255,0.05)", borderRadius:16, padding:"16px 20px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#a0c4ff", marginBottom:10 }}>Number of Cards</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[10, 20, 30, 40, "All"].map(n => {
              const val = n === "All" ? 9999 : n;
              const active = selectedQuestionCount === val;
              return (
                <button key={n} onClick={() => setSelectedQuestionCount(val)}
                  style={{ padding:"8px 18px", borderRadius:20, border:`2px solid ${active?"#6BCB77":"#ffffff22"}`, background:active?"#6BCB7722":"transparent", color:active?"#6BCB77":"#a0c4ff", cursor:"pointer", fontSize:13, fontWeight:700, transition:"all 0.2s" }}>
                  {n === "All" ? "All Cards" : `${n} Cards`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Period grid */}
        <div style={{ fontSize:13, fontWeight:700, color:"#a0c4ff", marginBottom:10 }}>Select a Period</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 }}>
          {/* All Periods button */}
          <button onClick={() => {
            const pool = shuffle([...allQuestions]);
            const qs = pool.slice(0, Math.min(selectedQuestionCount, pool.length));
            setQuestions(qs);
            setStudyIndex(0);
            setStudyFlipped(false);
            setScreen("study");
          }}
            style={{ background:"rgba(77,150,255,0.1)", border:"2px solid rgba(77,150,255,0.3)", borderRadius:14, padding:"16px 12px", cursor:"pointer", color:"#fff", textAlign:"center", transition:"all 0.2s" }}
            onMouseOver={e=>{ e.currentTarget.style.background="rgba(77,150,255,0.2)"; e.currentTarget.style.transform="scale(1.04)"; }}
            onMouseOut={e=>{ e.currentTarget.style.background="rgba(77,150,255,0.1)"; e.currentTarget.style.transform=""; }}>
            <div style={{ fontSize:28, marginBottom:6 }}>🌐</div>
            <div style={{ fontWeight:800, color:"#4D96FF", fontSize:13 }}>All Periods</div>
            <div style={{ fontSize:10, color:"#a0c4ff", marginTop:4 }}>{allQuestions.length} total cards</div>
          </button>
          {periods.map(pn => {
            const pname = allQuestions.find(q=>q.period_number===pn)?.period_name||"";
            const col = PERIOD_COLORS[pn-1]||"#4D96FF";
            const cnt = allQuestions.filter(q=>q.period_number===pn).length;
            return (
              <button key={pn} onClick={() => {
                const pool = shuffle(allQuestions.filter(q=>q.period_number===pn));
                const qs = pool.slice(0, Math.min(selectedQuestionCount, pool.length));
                setQuestions(qs);
                setStudyIndex(0);
                setStudyFlipped(false);
                setScreen("study");
              }}
                style={{ background:`${col}15`, border:`2px solid ${col}44`, borderRadius:14, padding:"16px 12px", cursor:"pointer", color:"#fff", textAlign:"center", transition:"all 0.2s" }}
                onMouseOver={e=>{ e.currentTarget.style.background=`${col}30`; e.currentTarget.style.transform="scale(1.04)"; }}
                onMouseOut={e=>{ e.currentTarget.style.background=`${col}15`; e.currentTarget.style.transform=""; }}>
                <div style={{ fontSize:28, marginBottom:6 }}>{PERIOD_EMOJIS[pn-1]}</div>
                <div style={{ fontWeight:800, color:col, fontSize:13 }}>Period {pn}</div>
                <div style={{ fontSize:11, color:"#a0c4ff", marginTop:4 }}>{pname}</div>
                <div style={{ fontSize:10, color:"#a0c4ff", marginTop:4 }}>{cnt} cards</div>
              </button>
            );
          })}
          {/* Geography tile */}
          {(() => {
            const geoQ = allQuestions.filter(q => q.period_name === "Geography");
            const geoCount = geoQ.length;
            return (
              <button onClick={() => {
                const pool = shuffle(geoQ);
                const qs = pool.slice(0, Math.min(selectedQuestionCount, pool.length));
                setQuestions(qs);
                setStudyIndex(0);
                setStudyFlipped(false);
                setScreen("study");
              }}
                style={{ background:"rgba(255,179,71,0.1)", border:"2px solid rgba(255,179,71,0.35)", borderRadius:14, padding:"16px 12px", cursor:"pointer", color:"#fff", textAlign:"center", transition:"all 0.2s" }}
                onMouseOver={e=>{ e.currentTarget.style.background="rgba(255,179,71,0.22)"; e.currentTarget.style.transform="scale(1.04)"; }}
                onMouseOut={e=>{ e.currentTarget.style.background="rgba(255,179,71,0.1)"; e.currentTarget.style.transform=""; }}>
                <div style={{ fontSize:28, marginBottom:6 }}>🗺️</div>
                <div style={{ fontWeight:800, color:"#FFB347", fontSize:13 }}>Geography</div>
                <div style={{ fontSize:11, color:"#a0c4ff", marginTop:4 }}>Old &amp; New Testament</div>
                <div style={{ fontSize:10, color:"#a0c4ff", marginTop:4 }}>{geoCount} cards</div>
              </button>
            );
          })()}
          {(() => {
            const proQ = allQuestions.filter(q => q.period_name === "Prophets");
            const proCount = proQ.length;
            return (
              <button onClick={() => {
                const pool = shuffle(proQ);
                const qs = pool.slice(0, Math.min(selectedQuestionCount, pool.length));
                setQuestions(qs);
                setStudyIndex(0);
                setStudyFlipped(false);
                setScreen("study");
              }}
                style={{ background:"rgba(255,107,157,0.1)", border:"2px solid rgba(255,107,157,0.35)", borderRadius:14, padding:"16px 12px", cursor:"pointer", color:"#fff", textAlign:"center", transition:"all 0.2s" }}
                onMouseOver={e=>{ e.currentTarget.style.background="rgba(255,107,157,0.22)"; e.currentTarget.style.transform="scale(1.04)"; }}
                onMouseOut={e=>{ e.currentTarget.style.background="rgba(255,107,157,0.1)"; e.currentTarget.style.transform=""; }}>
                <div style={{ fontSize:28, marginBottom:6 }}>📜</div>
                <div style={{ fontWeight:800, color:"#FF6B9D", fontSize:13 }}>Prophets</div>
                <div style={{ fontSize:11, color:"#a0c4ff", marginTop:4 }}>Old Testament Prophets</div>
                <div style={{ fontSize:10, color:"#a0c4ff", marginTop:4 }}>{proCount} cards</div>
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );

  if (screen === "study") {
    const q = questions[studyIndex];
    if (!q) return null;
    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", fontFamily:"'Nunito',sans-serif", color:"#fff", padding:24, display:"flex", flexDirection:"column", alignItems:"center" }}>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap" rel="stylesheet"/>
        <div style={{ maxWidth:600, width:"100%" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <button onClick={() => setScreen("studySetup")} style={{ background:"transparent", border:"none", color:"#a0c4ff", cursor:"pointer", fontSize:16 }}>← Back</button>
            <span style={{ color:"#a0c4ff", fontSize:14 }}>{studyIndex+1} / {questions.length}</span>
          </div>
          <ProgressBar value={studyIndex} max={questions.length}/>
          <div style={{ marginTop:8, marginBottom:6, display:"flex", gap:8, flexWrap:"wrap" }}>
            <span style={{ background:"#FFC93C22", color:"#FFC93C", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>{q.period_name}</span>
            <span style={{ background:"#845EC222", color:"#C4A7FF", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>{q.section}</span>
          </div>

          <div onClick={() => setStudyFlipped(f=>!f)} style={{ background:"rgba(255,255,255,0.08)", borderRadius:24, padding:"32px 24px", marginTop:8, cursor:"pointer", minHeight:200, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", textAlign:"center", border:"2px solid rgba(255,255,255,0.1)", transition:"all 0.3s" }}
            onMouseOver={e=>{e.currentTarget.style.background="rgba(255,255,255,0.12)";}}
            onMouseOut={e=>{e.currentTarget.style.background="rgba(255,255,255,0.08)";}}>
            {!studyFlipped ? (
              <>
                <div style={{ color:"#a0c4ff", fontSize:13, fontWeight:600, marginBottom:12, textTransform:"uppercase", letterSpacing:1 }}>Question</div>
                <div style={{ fontSize:"clamp(16px,3vw,22px)", fontWeight:700, lineHeight:1.4 }}>{q.question_text}</div>
                <div style={{ color:"#a0c4ff", fontSize:12, marginTop:20 }}>Tap to reveal answer</div>
              </>
            ) : (
              <>
                <div style={{ color:"#6BCB77", fontSize:13, fontWeight:600, marginBottom:12, textTransform:"uppercase", letterSpacing:1 }}>Answer</div>
                <div style={{ fontSize:"clamp(18px,4vw,28px)", fontWeight:800, color:"#6BCB77" }}>{q.answer_text_only}</div>
                {q.bible_reference && <div style={{ color:"#a0c4ff", fontSize:13, marginTop:12 }}>{q.bible_reference}</div>}
                {q.bible_reference !== q.original_answer && q.original_answer !== q.answer_text_only && (
                  <div style={{ color:"#a0c4ff", fontSize:11, marginTop:8, fontStyle:"italic" }}>{q.original_answer}</div>
                )}
                <div style={{ color:"#a0c4ff", fontSize:12, marginTop:20 }}>Tap to see question</div>
              </>
            )}
          </div>

          {/* Only show self-rating buttons after card is flipped */}
          {studyFlipped ? (
            <div style={{ display:"flex", gap:12, marginTop:20 }}>
              <button onClick={() => {
                setStudyNeeded(prev => [...prev.filter(id => id !== q.db_id), q.db_id]);
                setStudyFlipped(false);
                if(studyIndex+1>=questions.length){setScreen("studySetup");}else{setStudyIndex(i=>i+1);}
              }}
                style={{ flex:1, padding:"14px 10px", background:"rgba(255,107,107,0.15)", border:"2px solid rgba(255,107,107,0.4)", borderRadius:14, color:"#FF6B6B", cursor:"pointer", fontWeight:800, fontSize:14, textAlign:"center" }}>
                🔁 Need More Practice
              </button>
              <button onClick={() => {
                setStudyNeeded(prev => prev.filter(id => id !== q.db_id));
                setStudyFlipped(false);
                if(studyIndex+1>=questions.length){setScreen("studySetup");}else{setStudyIndex(i=>i+1);}
              }}
                style={{ flex:1, padding:"14px 10px", background:"rgba(107,203,119,0.15)", border:"2px solid rgba(107,203,119,0.4)", borderRadius:14, color:"#6BCB77", cursor:"pointer", fontWeight:800, fontSize:14, textAlign:"center" }}>
                ✅ I Know It!
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", gap:12, marginTop:20 }}>
              <button onClick={() => { setStudyIndex(i=>Math.max(0,i-1)); setStudyFlipped(false); }}
                disabled={studyIndex===0}
                style={{ flex:1, padding:"12px", background:studyIndex===0?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.12)", border:"none", borderRadius:12, color:studyIndex===0?"#555":"#fff", cursor:studyIndex===0?"not-allowed":"pointer", fontWeight:700, fontSize:15 }}>
                ← Prev
              </button>
              <button onClick={() => { setStudyFlipped(false); if(studyIndex+1>=questions.length){setScreen("studySetup");}else{setStudyIndex(i=>i+1);} }}
                style={{ flex:2, padding:"12px", background:"rgba(255,255,255,0.12)", border:"none", borderRadius:12, color:"#fff", cursor:"pointer", fontWeight:700, fontSize:15 }}>
                Skip →
              </button>
            </div>
          )}
          {studyNeeded.length > 0 && (
            <div style={{ marginTop:14, textAlign:"center", color:"#FF6B6B", fontSize:13, fontWeight:600 }}>
              🔁 {studyNeeded.length} card{studyNeeded.length > 1 ? "s" : ""} marked for more practice
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === "jeopardy") {
    const jPeriods = periods;
    const jValues = [100,200,300,400,500];
    const totalAvailable = jPeriods.length * jValues.length;
    const totalDone = Object.keys(jeopardyScores).length;
    const playerScore = Object.values(jeopardyScores).filter(Boolean).reduce((a,b)=>a+b,0);

    if (jeopardyQ) {
      const { q, points } = jeopardyQ;
      const aiD = aiDistractorCache[q.db_id];
      const opts = shuffle([q.answer_text_only, ...(aiD && aiD.length === 3 ? aiD : getDistractors(q, allQuestions))]);
      return (
        <div style={{ minHeight:"100vh", background:"#1a237e", fontFamily:"'Nunito',sans-serif", color:"#fff", padding:24, display:"flex", flexDirection:"column", alignItems:"center" }}>
          <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap" rel="stylesheet"/>
          <div style={{ maxWidth:600, width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:"#FFC93C" }}>{points}</span>
              <span style={{ color:"#a0c4ff", fontSize:14 }}>Score: {playerScore}</span>
            </div>
            <div style={{ background:"rgba(255,255,255,0.1)", borderRadius:20, padding:"28px 20px", marginBottom:20, textAlign:"center", border:"2px solid rgba(255,255,255,0.2)" }}>
              <div style={{ color:"#FFC93C", fontSize:13, fontWeight:700, marginBottom:12, textTransform:"uppercase" }}>{q.period_name}</div>
              <div style={{ fontSize:"clamp(16px,3vw,22px)", fontWeight:700, lineHeight:1.4 }}>{q.question_text}</div>
            </div>
            {showResult === null ? (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {opts.map((opt,i) => (
                  <button key={i} onClick={() => {
                    const isC = normalizeAnswer(opt)===normalizeAnswer(q.answer_text_only);
                    setSelectedOption(i);
                    if(isC){setJeopardyScores(s=>({...s,[`${jeopardyQ.period}-${jeopardyQ.val}`]:points}));setConfetti(true);setTimeout(()=>setConfetti(false),2000);}
                    else{setJeopardyScores(s=>({...s,[`${jeopardyQ.period}-${jeopardyQ.val}`]:0}));}
                    setShowResult({correct:isC,answer:q.answer_text_only,ref:q.bible_reference});
                  }}
                    style={{ padding:"14px 10px", background:"rgba(255,255,255,0.1)", border:"2px solid rgba(255,255,255,0.2)", borderRadius:12, cursor:"pointer", color:"#fff", fontWeight:700, fontSize:14, transition:"all 0.2s" }}
                    onMouseOver={e=>{e.currentTarget.style.background="rgba(255,255,255,0.2)";}}
                    onMouseOut={e=>{e.currentTarget.style.background="rgba(255,255,255,0.1)";}}>
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>{showResult.correct?"🎉":"😔"}</div>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:24, color:showResult.correct?"#6BCB77":"#FF6B6B", marginBottom:8 }}>
                  {showResult.correct?`+${points} points!`:"Incorrect"}
                </div>
                <div style={{ color:"#a0c4ff", marginBottom:4 }}>Answer: <strong style={{ color:"#fff" }}>{showResult.answer}</strong></div>
                {showResult.ref && <div style={{ color:"#a0c4ff", fontSize:13 }}>{showResult.ref}</div>}
                <button onClick={() => { setJeopardyQ(null); setShowResult(null); }}
                  style={{ marginTop:20, padding:"12px 32px", background:"linear-gradient(90deg,#4D96FF,#845EC2)", border:"none", borderRadius:12, color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer" }}>
                  Back to Board
                </button>
              </div>
            )}
          </div>
          <Confetti active={confetti}/>
        </div>
      );
    }

    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a237e,#0d47a1)", fontFamily:"'Nunito',sans-serif", color:"#fff", padding:16 }}>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap" rel="stylesheet"/>
        <Confetti active={confetti}/>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <button onClick={() => setScreen("home")} style={{ background:"transparent", border:"none", color:"#a0c4ff", cursor:"pointer", fontSize:16 }}>← Home</button>
            <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, color:"#FFC93C" }}>🏆 Jeopardy!</span>
            <span style={{ fontFamily:"'Fredoka One',cursive", color:"#6BCB77", fontSize:22 }}>{playerScore} pts</span>
          </div>
          {totalDone >= totalAvailable && (
            <div style={{ textAlign:"center", marginBottom:16, padding:"12px", background:"rgba(255,199,60,0.15)", borderRadius:12, color:"#FFC93C", fontWeight:700 }}>
              🎉 Board Complete! Final Score: {playerScore}
            </div>
          )}
          <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:12, padding:"8px 0", marginBottom:8 }}>
            <div style={{ display:"grid", gridTemplateColumns:"160px repeat(5,1fr)", gap:4, padding:"0 8px", marginBottom:4 }}>
              <div/>
              {jValues.map(val => (
                <div key={val} style={{ textAlign:"center", fontFamily:"'Fredoka One',cursive", fontSize:16, color:"#FFC93C", padding:"6px 0" }}>{val}</div>
              ))}
            </div>
            {jPeriods.map(pn => {
              const pname = allQuestions.find(q=>q.period_number===pn)?.period_name||"";
              const col = PERIOD_COLORS[pn-1]||"#4D96FF";
              return (
                <div key={pn} style={{ display:"grid", gridTemplateColumns:"160px repeat(5,1fr)", gap:4, padding:"0 8px", marginBottom:4 }}>
                  <div style={{ background:"#1565c0", borderRadius:8, padding:"8px 10px", display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:14 }}>{PERIOD_EMOJIS[pn-1]}</span>
                    <span style={{ fontSize:"clamp(9px,1.2vw,12px)", fontWeight:800, color:col, lineHeight:1.2 }}>{pname}</span>
                  </div>
                  {jValues.map(val => {
                    const key = `${pn}-${val}`;
                    const used = key in jeopardyScores;
                    const won = jeopardyScores[key] > 0;
                    return (
                      <button key={key} onClick={() => {
                        if(used) return;
                        const pool = allQuestions.filter(q=>q.period_number===pn);
                        const q = shuffle(pool)[0];
                        if(!q) return;
                        setJeopardyQ({q, points:val, period:pn, val});
                        setShowResult(null);
                        fetchAIDistractors(q);
                      }}
                        style={{ background: used?(won?"#1b5e2088":"#37001588"):"#1565c0", border:"none", borderRadius:8, padding:"10px 4px", cursor:used?"not-allowed":"pointer", color: used?(won?"#6BCB77":"#FF6B6B"):"#FFC93C", fontFamily:"'Fredoka One',cursive", fontSize:"clamp(13px,2vw,18px)", transition:"all 0.15s" }}
                        onMouseOver={e=>{ if(!used){e.currentTarget.style.background="#1976d2";e.currentTarget.style.transform="scale(1.04)";} }}
                        onMouseOut={e=>{ if(!used){e.currentTarget.style.background="#1565c0";e.currentTarget.style.transform="";} }}>
                        {used?(won?"✓":"✗"):val}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "game" && currentQ) {
    const options = gameOptions;
    const levelLabel = getLevel(currentQ.section, currentQ.question_code);

    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", fontFamily:"'Nunito',sans-serif", color:"#fff", padding:16 }}>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap" rel="stylesheet"/>
        <Confetti active={confetti}/>
        <div style={{ maxWidth:650, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <button onClick={() => { clearInterval(timerRef.current); setScreen("home"); }} style={{ background:"transparent", border:"none", color:"#a0c4ff", cursor:"pointer", fontSize:15 }}>✕ Quit</button>
            {isHotSeat && currentPlayer && (
              <div style={{ background:"rgba(0,201,167,0.15)", border:"1px solid rgba(0,201,167,0.3)", borderRadius:20, padding:"4px 14px", fontSize:13, fontWeight:800, color:"#00C9A7" }}>
                🎯 {currentPlayer}'s Turn
              </div>
            )}
            <div style={{ display:"flex", gap:16, alignItems:"center" }}>
              {streak >= 2 && <span style={{ background:"#FF6B6B22", color:"#FF6B6B", borderRadius:20, padding:"4px 12px", fontSize:13, fontWeight:700 }}>🔥 {streak}</span>}
              <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:20, color:"#FFC93C" }}>{score} pts</span>
            </div>
          </div>

          <div style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
            <ProgressBar value={qIndex} max={questions.length}/>
            <span style={{ color:"#a0c4ff", fontSize:12, whiteSpace:"nowrap" }}>{qIndex+1}/{questions.length}</span>
          </div>

          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
            <span style={{ background:"#FFC93C22", color:"#FFC93C", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>{PERIOD_EMOJIS[currentQ.period_number-1]} {currentQ.period_name}</span>
            <span style={{ background:"#845EC222", color:"#C4A7FF", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>{currentQ.section}</span>
            <span style={{ background:"#4D96FF22", color:"#4D96FF", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>Level {levelLabel}</span>
            {aiDistractorCache[currentQ?.db_id] ? <span style={{ background:"#6BCB7722", color:"#6BCB77", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>✦ AI Choices</span> : <span style={{ background:"rgba(255,255,255,0.06)", color:"#666", borderRadius:20, padding:"3px 10px", fontSize:11 }}>loading choices…</span>}
          </div>

          {gameMode === "speed" && showResult === null && (
            <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}>
              <TimerRing seconds={timer} max={10}/>
            </div>
          )}

          <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:20, padding:"24px 20px", marginBottom:16, border:"1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize:"clamp(16px,3vw,22px)", fontWeight:700, lineHeight:1.45 }}>{currentQ.question_text}</div>
          </div>

          {/* Hint button — one per game, shows Bible reference */}
          {showResult === null && currentQ.bible_reference && (gameMode === "multiple" || gameMode === "speed" || gameMode === "free") && (
            <div style={{ marginBottom:12, textAlign:"center" }}>
              {!hintVisible ? (
                <button onClick={() => { setHintUsed(true); setHintVisible(true); }}
                  disabled={hintUsed && !hintVisible}
                  style={{ padding:"7px 20px", background: hintUsed?"rgba(255,255,255,0.04)":"rgba(255,179,71,0.15)", border:`1px solid ${hintUsed?"#333":"rgba(255,179,71,0.4)"}`, borderRadius:20, color:hintUsed?"#444":"#FFB347", fontSize:13, fontWeight:700, cursor:hintUsed?"not-allowed":"pointer" }}>
                  💡 {hintUsed ? "Hint used" : "Use Hint (1 per game)"}
                </button>
              ) : (
                <div style={{ background:"rgba(255,179,71,0.12)", border:"1px solid rgba(255,179,71,0.3)", borderRadius:12, padding:"8px 16px", display:"inline-block" }}>
                  <span style={{ color:"#FFB347", fontSize:13, fontWeight:700 }}>💡 {currentQ.bible_reference}</span>
                </div>
              )}
            </div>
          )}

          {showResult === null ? (
            <>
              {(gameMode === "multiple" || gameMode === "speed") && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    {options.map((opt,i) => (
                      <button key={i} onClick={() => {
                        const isC = normalizeAnswer(opt) === normalizeAnswer(currentQ.answer_text_only);
                        setSelectedOption(i);
                        handleAnswer(opt, isC, gameMode==="speed"&&timer>=7);
                      }}
                        style={{ padding:"14px 12px", background:"rgba(255,255,255,0.08)", border:"2px solid rgba(255,255,255,0.15)", borderRadius:14, cursor:"pointer", color:"#fff", fontWeight:700, fontSize:14, textAlign:"left", transition:"all 0.15s" }}
                        onMouseOver={e=>{e.currentTarget.style.background="rgba(255,255,255,0.18)";e.currentTarget.style.borderColor="rgba(255,255,255,0.4)";}}
                        onMouseOut={e=>{e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.borderColor="rgba(255,255,255,0.15)";}}>
                        <span style={{ color:"#845EC2", marginRight:6 }}>{String.fromCharCode(65+i)}.</span>{opt}
                      </button>
                    ))}
                  </div>
              )}
              {gameMode === "free" && (
                <div>
                  <input value={freeInput} onChange={e=>setFreeInput(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter"&&freeInput.trim()){handleAnswer(freeInput,checkAnswer(freeInput,currentQ.answer_text_only),false);} }}
                    placeholder="Type your answer..."
                    style={{ width:"100%", padding:"14px 16px", fontSize:18, borderRadius:12, border:"2px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.08)", color:"#fff", outline:"none", boxSizing:"border-box", fontFamily:"'Nunito',sans-serif" }}
                    autoFocus/>
                  <button onClick={() => { if(freeInput.trim()) handleAnswer(freeInput,checkAnswer(freeInput,currentQ.answer_text_only),false); }}
                    style={{ marginTop:12, width:"100%", padding:"14px", background:"linear-gradient(90deg,#4D96FF,#845EC2)", border:"none", borderRadius:12, color:"#fff", fontWeight:800, fontSize:18, cursor:"pointer" }}>
                    Submit Answer
                  </button>
                  <button onClick={() => handleAnswer("",false,false)}
                    style={{ marginTop:8, width:"100%", padding:"10px", background:"transparent", border:"1px solid rgba(255,255,255,0.2)", borderRadius:12, color:"#a0c4ff", fontWeight:600, fontSize:14, cursor:"pointer" }}>
                    Skip
                  </button>
                </div>
              )}
            </>
          ) : (
            <div>
              <div style={{ background: showResult.correct?"rgba(107,203,119,0.15)":"rgba(255,107,107,0.15)", borderRadius:16, padding:"20px 16px", border:`2px solid ${showResult.correct?"#6BCB7766":"#FF6B6B66"}`, marginBottom:16, textAlign:"center" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:12 }}>
                  <span style={{ fontSize:32 }}>{showResult.correct?"✅":"❌"}</span>
                  <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:24, color:showResult.correct?"#6BCB77":"#FF6B6B" }}>
                    {showResult.correct?"Correct!":"Not quite..."}
                  </span>
                  {showResult.correct && showResult.speedBonus && (
                    <span style={{ background:"#FFC93C22", color:"#FFC93C", borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:700 }}>⚡ +5 Speed Bonus!</span>
                  )}
                </div>
                <div style={{ color:"#a0c4ff", fontSize:12, fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Correct Answer</div>
                <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"clamp(20px,4vw,30px)", color:"#6BCB77", fontWeight:800, lineHeight:1.2, marginBottom:showResult.ref?8:0 }}>{showResult.answer}</div>
                {showResult.ref && <div style={{ color:"#a0c4ff", fontSize:13, marginTop:4 }}>{showResult.ref}</div>}
                {showResult.original && showResult.original !== showResult.answer && (
                  <div style={{ color:"#a0c4ff", fontSize:12, marginTop:4, fontStyle:"italic" }}>{showResult.original}</div>
                )}
              </div>
              {(gameMode==="multiple"||gameMode==="speed") && options.map((opt,i) => {
                const isCorrect = normalizeAnswer(opt)===normalizeAnswer(currentQ.answer_text_only);
                return (
                  <div key={i} style={{ padding:"10px 12px", borderRadius:10, marginBottom:6, background: isCorrect?"rgba(107,203,119,0.2)":selectedOption===i?"rgba(255,107,107,0.15)":"transparent", border:`1px solid ${isCorrect?"#6BCB7766":selectedOption===i?"#FF6B6B66":"transparent"}`, color:isCorrect?"#6BCB77":selectedOption===i?"#FF6B6B":"#a0c4ff", fontSize:14, fontWeight:600 }}>
                    {isCorrect?"✓":selectedOption===i?"✗":"  "} {opt}
                  </div>
                );
              })}
              <button onClick={nextQuestion}
                style={{ width:"100%", marginTop:8, padding:"14px", background:"linear-gradient(90deg,#4D96FF,#845EC2)", border:"none", borderRadius:12, color:"#fff", fontWeight:800, fontSize:18, cursor:"pointer", letterSpacing:0.5 }}>
                {qIndex+1 >= questions.length ? "See Results 🏁" : "Next Question →"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === "results") {
    const total = questions.length;
    const pct = Math.round(score / (total*10) * 100);
    const grade = score >= total*12?"⭐ Master":score>=total*8?"🥈 Intermediate":"🌱 Beginner";

    // ── HOT SEAT RESULTS ──
    if (isHotSeat && hotSeatPlayers.length > 0) {
      const sorted = [...hotSeatPlayers].sort((a,b) => (hotSeatScores[b]||0) - (hotSeatScores[a]||0));
      const winner = sorted[0];
      const podiumColors = ["#FFC93C","#C0C0C0","#CD7F32"];
      const podiumIcons = ["🥇","🥈","🥉"];
      return (
        <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", fontFamily:"'Nunito',sans-serif", color:"#fff", padding:24, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <Confetti active={true}/>
          <div style={{ maxWidth:520, width:"100%", textAlign:"center" }}>
            <div style={{ fontSize:64, marginBottom:4 }}>🏆</div>
            <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:36, margin:"0 0 4px", color:"#FFC93C" }}>Game Over!</h2>
            <div style={{ color:"#00C9A7", fontWeight:800, fontSize:20, marginBottom:24 }}>🎉 {winner} wins!</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
              {sorted.map((name, i) => (
                <div key={name} style={{ display:"flex", alignItems:"center", gap:14, background:i===0?"rgba(255,199,60,0.12)":"rgba(255,255,255,0.06)", borderRadius:16, padding:"14px 20px", border:i===0?"2px solid rgba(255,199,60,0.4)":"2px solid transparent" }}>
                  <span style={{ fontSize:28, width:36 }}>{podiumIcons[i]||`${i+1}.`}</span>
                  <div style={{ flex:1, textAlign:"left" }}>
                    <div style={{ fontWeight:800, fontSize:17, color:podiumColors[i]||"#fff" }}>{name}</div>
                    <div style={{ fontSize:12, color:"#a0c4ff" }}>{hotSeatCorrect[name]||0}/{total} correct</div>
                  </div>
                  <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:26, color:podiumColors[i]||"#a0c4ff" }}>{hotSeatScores[name]||0}</span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => { setScreen("home"); }} style={{ flex:1, padding:"14px", background:"rgba(255,255,255,0.1)", border:"2px solid rgba(255,255,255,0.2)", borderRadius:12, color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer" }}>🏠 Home</button>
              <button onClick={() => {
                  const initS={}, initC={};
                  hotSeatPlayers.forEach(n=>{initS[n]=0;initC[n]=0;});
                  setHotSeatScores(initS); setHotSeatCorrect(initC);
                  setCurrentPlayerIdx(0);
                  startGame("hotseat", { count: questions.length });
                }}
                style={{ flex:2, padding:"14px", background:"linear-gradient(90deg,#00C9A7,#4D96FF)", border:"none", borderRadius:12, color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer" }}>
                🔄 Play Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", fontFamily:"'Nunito',sans-serif", color:"#fff", padding:24, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <Confetti active={true}/>
        <div style={{ maxWidth:520, width:"100%" }}>
          {showLeaderboard ? (
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                <button onClick={() => setShowLeaderboard(false)} style={{ background:"transparent", border:"none", color:"#a0c4ff", cursor:"pointer", fontSize:16 }}>← Back</button>
                <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:28, margin:0, color:"#FFC93C" }}>🏆 Leaderboard</h2>
              </div>
              <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:16, overflow:"hidden" }}>
                {leaderboard.length === 0 ? (
                  <div style={{ padding:32, textAlign:"center", color:"#a0c4ff" }}>No scores yet — play a game!</div>
                ) : leaderboard.map((entry, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)", background: i===0?"rgba(255,199,60,0.08)":i===1?"rgba(255,255,255,0.04)":i===2?"rgba(255,142,83,0.06)":"transparent" }}>
                    <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:20, width:32, color: i===0?"#FFC93C":i===1?"#a0c4ff":i===2?"#FF8E53":"#666" }}>
                      {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`}
                    </span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:15 }}>{entry.name}</div>
                      <div style={{ fontSize:11, color:"#a0c4ff" }}>{entry.mode} · {entry.date}</div>
                    </div>
                    <span style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:"#FFC93C" }}>{entry.score}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => { setLeaderboard([]); localStorage.removeItem("bdLeaderboard"); }}
                style={{ marginTop:12, width:"100%", padding:"10px", background:"transparent", border:"1px solid rgba(255,107,107,0.3)", borderRadius:12, color:"#FF6B6B", cursor:"pointer", fontSize:13 }}>
                Clear Leaderboard
              </button>
            </div>
          ) : (
            <>
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <div style={{ fontSize:64, marginBottom:4 }}>{grade.split(" ")[0]}</div>
                <h2 style={{ fontFamily:"'Fredoka One',cursive", fontSize:36, margin:"0 0 4px", color:"#FFC93C" }}>Game Over!</h2>
                <div style={{ color:"#a0c4ff" }}>{grade}</div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
                {[["🎯","Score",score+" pts"],["🔥","Best Streak",bestStreak],["📊","Questions",total]].map(([ic,lb,val]) => (
                  <div key={lb} style={{ background:"rgba(255,255,255,0.08)", borderRadius:16, padding:"14px 8px", textAlign:"center" }}>
                    <div style={{ fontSize:22 }}>{ic}</div>
                    <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:22, color:"#FFC93C" }}>{val}</div>
                    <div style={{ color:"#a0c4ff", fontSize:11 }}>{lb}</div>
                  </div>
                ))}
              </div>

              {!nameSaved ? (
                <div style={{ background:"rgba(255,199,60,0.1)", border:"2px solid rgba(255,199,60,0.3)", borderRadius:16, padding:16, marginBottom:16 }}>
                  <div style={{ fontWeight:700, color:"#FFC93C", marginBottom:8, fontSize:15 }}>🏆 Save your score!</div>
                  <div style={{ display:"flex", gap:8 }}>
                    <input value={playerName} onChange={e=>setPlayerName(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter"&&playerName.trim()){ saveScore(playerName, score, gameMode); setNameSaved(true); }}}
                      placeholder="Enter your name…"
                      style={{ flex:1, padding:"10px 14px", borderRadius:10, border:"2px solid rgba(255,199,60,0.4)", background:"rgba(255,255,255,0.08)", color:"#fff", fontSize:15, fontFamily:"'Nunito',sans-serif", outline:"none" }}/>
                    <button onClick={() => { saveScore(playerName||"Anonymous", score, gameMode); setNameSaved(true); }}
                      style={{ padding:"10px 18px", background:"#FFC93C", border:"none", borderRadius:10, fontWeight:800, cursor:"pointer", color:"#1a1a2e", fontSize:15 }}>
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom:16 }}>
                  <div style={{ background:"rgba(107,203,119,0.1)", border:"2px solid rgba(107,203,119,0.3)", borderRadius:16, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <span style={{ color:"#6BCB77", fontWeight:700 }}>✅ Score saved locally!</span>
                    <button onClick={() => setShowLeaderboard(true)}
                      style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, padding:"6px 14px", color:"#FFC93C", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                      My Scores →
                    </button>
                  </div>
                  {!publicSubmitted ? (
                    <button onClick={() => {
                        const correctCount = questions.filter((_,i) => {
                          // approximate correct count from score
                          return false;
                        }).length;
                        const approxCorrect = Math.round(score / 10);
                        submitPublicScore(playerName||"Anonymous", score, gameMode, questions.length, approxCorrect);
                      }}
                      disabled={publicSubmitting}
                      style={{ width:"100%", padding:"11px", background:publicSubmitting?"rgba(77,150,255,0.1)":"rgba(77,150,255,0.15)", border:"2px solid rgba(77,150,255,0.35)", borderRadius:12, color:publicSubmitting?"#555":"#4D96FF", fontWeight:700, fontSize:14, cursor:publicSubmitting?"not-allowed":"pointer" }}>
                      {publicSubmitting ? "Posting..." : "🌍 Post to World Leaderboard"}
                    </button>
                  ) : (
                    <div style={{ background:"rgba(77,150,255,0.1)", border:"2px solid rgba(77,150,255,0.3)", borderRadius:12, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ color:"#4D96FF", fontWeight:700 }}>🌍 Posted to World Board!</span>
                      <button onClick={() => { setShowPublicBoard(true); fetchPublicBoard(); }}
                        style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, padding:"6px 14px", color:"#4D96FF", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                        See it →
                      </button>
                    </div>
                  )}
                  {publicBoardError && <div style={{ color:"#FF6B6B", fontSize:12, marginTop:6 }}>{publicBoardError}</div>}
                </div>
              )}

              <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:16, padding:16, marginBottom:16 }}>
                <div style={{ fontWeight:700, marginBottom:10, color:"#FFC93C", fontSize:14 }}>Performance by Period</div>
                {[...new Set(questions.map(q=>q.period_number))].map(pn => {
                  const pqs = questions.filter(q=>q.period_number===pn);
                  const pname = pqs[0]?.period_name||"";
                  return (
                    <div key={pn} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                      <span style={{ fontSize:13 }}>{PERIOD_EMOJIS[pn-1]}</span>
                      <span style={{ fontSize:11, color:"#a0c4ff", width:110, flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{pname}</span>
                      <div style={{ flex:1 }}><ProgressBar value={pqs.length} max={pqs.length} color={PERIOD_COLORS[pn-1]}/></div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display:"flex", gap:10, marginBottom:10 }}>
                <button onClick={() => { setNameSaved(false); setPlayerName(""); setScreen("home"); }} style={{ flex:1, padding:"13px", background:"rgba(255,255,255,0.1)", border:"2px solid rgba(255,255,255,0.2)", borderRadius:12, color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer" }}>🏠 Home</button>
                <button onClick={() => setShowLeaderboard(true)} style={{ flex:1, padding:"13px", background:"rgba(255,199,60,0.15)", border:"2px solid rgba(255,199,60,0.3)", borderRadius:12, color:"#FFC93C", fontWeight:800, fontSize:15, cursor:"pointer" }}>🏆 Scores</button>
                <button onClick={() => { setNameSaved(false); setPlayerName(""); const qs=shuffle(questions); setQuestions(qs); setQIndex(0); setScore(0); setStreak(0); setShowResult(null); setSelectedOption(null); setFreeInput(""); setScreen("game"); setTimer(10); }}
                  style={{ flex:2, padding:"13px", background:"linear-gradient(90deg,#4D96FF,#845EC2)", border:"none", borderRadius:12, color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer" }}>
                  🔄 Again
                </button>
              </div>
              {missedIds.size > 0 && (
                <button onClick={() => { setNameSaved(false); setPlayerName(""); startGame("multiple",{missed:true}); }}
                  style={{ width:"100%", padding:"11px", background:"#FF8E5322", border:"2px solid #FF8E5344", borderRadius:12, color:"#FF8E53", fontWeight:700, fontSize:14, cursor:"pointer" }}>
                  📚 Review {missedIds.size} Missed Questions
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#1a1a2e", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontFamily:"'Nunito',sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>✝️</div>
        <div>Loading Bible Drill...</div>
      </div>
    </div>
  );
}
