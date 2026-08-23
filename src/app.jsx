import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import BodyFigure from "./body-map.jsx";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  Clock3,
  Download,
  Dumbbell,
  ExternalLink,
  FileUp,
  Flame,
  Footprints,
  Gauge,
  Heart,
  History,
  Home,
  Info,
  Library,
  Minus,
  Moon,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  Star,
  Sun,
  Target,
  TimerReset,
  Trash2,
  Trophy,
  Undo2,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { BACKGROUNDS, CALORIE_SOURCES, WODS, WOD_BY_ID } from "./wod-data.js";
import { adaptiveRoundPace, aggregateCounts, clamp, estimateCalories, runningMet, totalReps } from "./fitness-metrics.js";
import { createI18n, LOCALES } from "./i18n.js";

const APP_VERSION = "2.0.0";
const DAY = 86_400_000;
const requestedLanguage = (() => {
  const requested = new URLSearchParams(globalThis.location?.search || "").get("lang");
  return ["en", "ko", "ja", "zh"].includes(requested) ? requested : null;
})();
const detectedLanguage = (() => {
  if (requestedLanguage) return requestedLanguage;
  const code = globalThis.navigator?.language?.toLowerCase() || "en";
  if (code.startsWith("ko")) return "ko";
  if (code.startsWith("ja")) return "ja";
  if (code.startsWith("zh")) return "zh";
  return "en";
})();

const defaultState = {
  profile: {
    name: "Athlete",
    age: 30,
    weightKg: 75,
    heightCm: 175,
    experience: "Intermediate",
    defaultRpe: 7,
  },
  settings: {
    monochrome: false,
    sound: true,
    reducedMotion: false,
    language: detectedLanguage,
    storyBackground: "dawn",
  },
  favorites: ["cindy", "fran", "helen"],
  logs: [],
};

const navItems = [
  ["home", "nav.home", Home],
  ["library", "nav.workouts", Library],
  ["run", "nav.run", Footprints],
  ["calendar", "nav.log", CalendarDays],
  ["profile", "nav.profile", UserRound],
];

const I18nContext = React.createContext(createI18n("en"));
const useI18n = () => React.useContext(I18nContext);

const pad = (value) => String(Math.max(0, value)).padStart(2, "0");
const formatClock = (seconds, includeHours = false) => {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;
  return hours || includeHours ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
};
const formatPace = (secondsPerKm) => Number.isFinite(secondsPerKm) && secondsPerKm > 0 ? `${formatClock(secondsPerKm)}/km` : "—";
const isoDay = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};
const displayDate = (value, localeTag = "en-US", options = {}) => new Intl.DateTimeFormat(localeTag, { month: "short", day: "numeric", ...options }).format(new Date(`${value}T12:00:00`));
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const difficultyColor = (difficulty) => difficulty >= 5 ? "danger" : difficulty >= 4 ? "warm" : difficulty <= 2 ? "easy" : "steady";

const openExternal = async (url) => {
  if (!url) return;
  if (window.KipsetNative?.openExternal) return window.KipsetNative.openExternal(url);
  window.open(url, "_blank", "noopener,noreferrer");
};

const loadState = async () => {
  try {
    const nativeState = await window.KipsetNative?.loadState?.();
    if (nativeState) return nativeState;
    const stored = localStorage.getItem("kipset-preview-state");
    return stored ? JSON.parse(stored) : defaultState;
  } catch {
    return defaultState;
  }
};

const persistState = async (state) => {
  try {
    if (window.KipsetNative?.saveState) await window.KipsetNative.saveState(state);
    else localStorage.setItem("kipset-preview-state", JSON.stringify(state));
  } catch {
    // The app remains usable when local persistence is unavailable.
  }
};

function Mark({ compact = false }) {
  return (
    <span className={`mark ${compact ? "compact" : ""}`} aria-hidden="true">
      <img src="./brand/kipset-symbol.png" alt="" />
    </span>
  );
}

function Difficulty({ value, showText = true }) {
  const { t, label } = useI18n();
  return (
    <span className={`difficulty ${difficultyColor(value)}`} title={t("difficulty.note")}>
      <span className="difficulty-bars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((level) => <i key={level} className={level <= value ? "on" : ""} />)}
      </span>
      {showText && <span>{label("difficulty", value)}</span>}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, unit, tone }) {
  return (
    <article className={`stat-card ${tone || ""}`}>
      <Icon size={17} aria-hidden="true" />
      <p>{label}</p>
      <strong>{value}</strong>
      {unit && <span>{unit}</span>}
    </article>
  );
}

function WorkoutCard({ wod, favorite, onOpen, onToggleFavorite }) {
  const { t, label, wod: localizeWod } = useI18n();
  const copy = localizeWod(wod);
  return (
    <article className="workout-card" data-difficulty={wod.difficulty}>
      <div className="workout-card-head">
        <span>{copy.mode} · {wod.duration} {t("common.min")}</span>
        <button className={`bare-icon ${favorite ? "selected" : ""}`} type="button" onClick={(event) => { event.stopPropagation(); onToggleFavorite(wod.id); }} aria-label={t(favorite ? "favorite.remove" : "favorite.add", { name: wod.name })} aria-pressed={favorite}>
          <Star size={16} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <button className="card-main" type="button" onClick={() => onOpen(wod)}>
        <span className="category-label">{copy.category}</span>
        <h3>{wod.name}</h3>
        <p>{copy.steps.slice(0, 2).join(" · ")}</p>
      </button>
      <div className="workout-card-foot">
        <Difficulty value={wod.difficulty} />
        <button className="round-arrow" type="button" onClick={() => onOpen(wod)} aria-label={t("workout.open", { name: wod.name })}><ArrowRight size={17} /></button>
      </div>
    </article>
  );
}

function HomeView({ state, onOpenWorkout, onNavigate }) {
  const { t, label, localeTag, wod: localizeWod } = useI18n();
  const logs = state.logs;
  const now = Date.now();
  const weekLogs = logs.filter((log) => now - new Date(`${log.date}T12:00:00`).getTime() < 7 * DAY);
  const favoriteWods = state.favorites.map((id) => WOD_BY_ID[id]).filter(Boolean).slice(0, 4);
  const featured = WOD_BY_ID.cindy;
  const featuredCopy = localizeWod(featured);
  const weekMinutes = Math.round(weekLogs.reduce((sum, log) => sum + Number(log.durationSec || 0), 0) / 60);
  const weekCalories = weekLogs.reduce((sum, log) => sum + Number(log.calories || 0), 0);
  const sessions = new Set(logs.map((log) => log.date));
  let streak = 0;
  for (let day = 0; day < 365; day += 1) {
    const key = isoDay(new Date(now - day * DAY));
    if (sessions.has(key)) streak += 1;
    else if (day > 0 || !sessions.size) break;
  }

  return (
    <div className="view-enter">
      <header className="page-header">
        <div><p className="eyebrow">{new Intl.DateTimeFormat(localeTag, { weekday: "long", month: "short", day: "numeric" }).format(new Date()).toUpperCase()}</p><h1>{t("home.title")}</h1></div>
        <button className="avatar-button" type="button" onClick={() => onNavigate("profile")} aria-label={t("profile.open")}><span>{state.profile.name.slice(0, 2).toUpperCase()}</span></button>
      </header>

      <section className="daily-hero">
        <div className="daily-copy">
          <p className="eyebrow accent">{t("home.benchmark")}</p>
          <h2>{featured.name}</h2>
          <p>{featuredCopy.description}</p>
          <div className="movement-strip">{featuredCopy.steps.map((step) => <span key={step}>{step}</span>)}</div>
          <button className="primary-action" type="button" onClick={() => onOpenWorkout(featured)}>{t("home.start")} <ArrowRight size={17} /></button>
        </div>
        <div className="target-dial" aria-label={`${t("home.target")} ${featured.targetRounds} ${t("common.rounds")}`}>
          <div className="dial"><small>{t("home.target")}</small><strong>{featured.targetRounds}</strong><span>{t("common.rounds")}</span></div>
          <p><i /> {t("home.adaptive")} · {formatClock(featured.duration * 60 / featured.targetRounds)}</p>
        </div>
      </section>

      <section className="stat-grid" aria-label={t("home.week")}>
        <StatCard icon={Activity} label={t("home.week")} value={weekLogs.length} unit={t("common.sessions")} />
        <StatCard icon={Clock3} label={t("home.trainingTime")} value={weekMinutes} unit={t("common.minutes")} />
        <StatCard icon={Flame} label={t("home.burn")} value={weekCalories} unit={t("common.kcal")} />
        <StatCard icon={Zap} label={t("home.streak")} value={streak} unit={t("common.days")} tone="accented" />
      </section>

      <section className="content-section">
        <div className="section-title"><div><p className="eyebrow">{t("home.quick")}</p><h2>{t("home.saved")}</h2></div><button className="text-action" type="button" onClick={() => onNavigate("library")}>{t("home.browse")} <ArrowRight size={15} /></button></div>
        <div className="compact-workouts">
          {(favoriteWods.length ? favoriteWods : WODS.slice(0, 4)).map((wod) => (
            <button key={wod.id} type="button" onClick={() => onOpenWorkout(wod)}><span>{label("mode", wod.mode)}</span><strong>{wod.name}</strong><small>{wod.duration} {t("common.min")} · {label("difficulty", wod.difficulty)}</small><ChevronRight size={18} /></button>
          ))}
        </div>
      </section>

      <section className="content-section recent-home">
        <article className="panel recent-panel">
          <div className="panel-heading"><div><p className="eyebrow">{t("home.recent")}</p><h3>{t("home.last")}</h3></div><History size={20} /></div>
          {logs.length ? logs.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 4).map((log) => (
            log.type === "wod" && WOD_BY_ID[log.wodId] ? (
              <button className="recent-row recent-action" type="button" key={log.id} onClick={() => onOpenWorkout(WOD_BY_ID[log.wodId])} aria-label={t("home.repeat", { name: log.name })}><span className="log-icon"><RotateCcw size={15} /></span><div><strong>{log.name}</strong><small>{displayDate(log.date, localeTag)} · {formatClock(log.durationSec)}</small></div><b>{log.calories}<small> {t("common.kcal")}</small></b><ChevronRight size={17} /></button>
            ) : (
              <div className="recent-row" key={log.id}><span className="log-icon run"><Footprints size={15} /></span><div><strong>{t("run.name", { distance: Number(log.distanceKm).toFixed(2).replace(/\.00$/, "") })}</strong><small>{displayDate(log.date, localeTag)} · {formatClock(log.durationSec)}</small></div><b>{log.calories}<small> {t("common.kcal")}</small></b></div>
            )
          )) : <EmptyState icon={History} title={t("home.noSessions")} copy={t("home.noSessionsCopy")} />}
        </article>
      </section>
    </div>
  );
}

function LibraryView({ favorites, onOpenWorkout, onToggleFavorite }) {
  const { t, label, wod: localizeWod } = useI18n();
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const filtered = useMemo(() => WODS.filter((wod) => {
    const copy = localizeWod(wod);
    const searchText = `${wod.name} ${wod.mode} ${copy.mode} ${wod.category} ${copy.category} ${wod.tags.join(" ")} ${copy.tags.join(" ")} ${wod.steps.join(" ")} ${copy.steps.join(" ")}`.toLowerCase();
    return (!query || searchText.includes(query.toLowerCase()))
      && (difficulty === "all" || wod.difficulty === Number(difficulty))
      && (category === "all" || wod.category === category)
      && (!favoriteOnly || favorites.includes(wod.id));
  }), [query, difficulty, category, favoriteOnly, favorites, localizeWod]);

  return (
    <div className="view-enter">
      <header className="page-header library-header"><div><p className="eyebrow">{t("library.eyebrow")}</p><h1>{t("library.title")}</h1><p>{t("library.copy")}</p></div></header>
      <div className="library-tools">
        <label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("library.search")} aria-label={t("library.search")} />{query && <button type="button" onClick={() => setQuery("")} aria-label={t("search.clear")}><X size={15} /></button>}</label>
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label={t("library.allCategories")}><option value="all">{t("library.allCategories")}</option>{["Benchmark", "Hero", "Foundation", "Running"].map((item) => <option key={item} value={item}>{label("category", item)}</option>)}</select>
        <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} aria-label={t("library.allLevels")}><option value="all">{t("library.allLevels")}</option>{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{label("difficulty", level)}</option>)}</select>
        <button className={`favorite-filter ${favoriteOnly ? "active" : ""}`} type="button" onClick={() => setFavoriteOnly((value) => !value)} aria-pressed={favoriteOnly}><Star size={15} fill={favoriteOnly ? "currentColor" : "none"} /> {t("library.saved")}</button>
      </div>
      <div className="result-count"><span>{t("library.count", { count: filtered.length })}</span><small>{t("library.note")}</small></div>
      <div className="workout-grid">
        {filtered.map((wod) => <WorkoutCard key={wod.id} wod={wod} favorite={favorites.includes(wod.id)} onOpen={onOpenWorkout} onToggleFavorite={onToggleFavorite} />)}
      </div>
      {!filtered.length && <EmptyState icon={Search} title={t("library.noMatch")} copy={t("library.noMatchCopy")} />}
    </div>
  );
}

function MuscleMap({ wod }) {
  const { t, label } = useI18n();
  return (
    <div className="muscle-map-wrap">
      <div className="body-pair">
        <div><BodyFigure muscles={wod.muscles} type="anterior" label={`${wod.name} ${t("common.front")}`} /><small>{t("common.front")}</small></div>
        <div><BodyFigure muscles={wod.muscles} type="posterior" label={`${wod.name} ${t("common.back")}`} /><small>{t("common.back")}</small></div>
      </div>
      <div className="muscle-copy"><div className="muscle-list">{wod.muscles.map((muscle, index) => <span key={muscle} className={index < 4 ? "primary" : ""}>{label("muscle", muscle)}</span>)}</div><div className="muscle-legend"><span><i className="primary" />{t("detail.primary")}</span><span><i />{t("detail.secondary")}</span></div></div>
    </div>
  );
}

function NumberControl({ value, onChange, min, max, label, suffix, hint }) {
  const { t } = useI18n();
  return (
    <div className="number-control">
      <div><label>{label}</label>{hint && <small>{hint}</small>}</div>
      <div className="stepper"><button type="button" onClick={() => onChange(clamp(value - 1, min, max))} aria-label={`${t("common.decrease")} ${label}`}><Minus size={15} /></button><strong>{value}</strong>{suffix && <span>{suffix}</span>}<button type="button" onClick={() => onChange(clamp(value + 1, min, max))} aria-label={`${t("common.increase")} ${label}`}><Plus size={15} /></button></div>
    </div>
  );
}

function WorkoutDetail({ wod, favorite, onBack, onStart, onToggleFavorite }) {
  const { t, wod: localizeWod } = useI18n();
  const copy = localizeWod(wod);
  const [rounds, setRounds] = useState(wod.targetRounds || wod.defaultRounds || 1);
  const [minutes, setMinutes] = useState(wod.duration || 20);
  const [rpe, setRpe] = useState(7);
  const roundLabel = wod.mode === "AMRAP" ? t("detail.roundGoal") : wod.mode === "EMOM" || wod.mode === "Intervals" ? t("detail.intervals") : t("detail.stages");
  const pace = minutes * 60 / Math.max(1, rounds);
  return (
    <div className="view-enter detail-view">
      <button className="back-action" type="button" onClick={onBack}><ArrowLeft size={17} /> {t("detail.back")}</button>
      <header className="detail-hero">
        <div className="detail-title">
          <div><span className="category-label accent">{copy.category}</span><button className={`bare-icon ${favorite ? "selected" : ""}`} type="button" onClick={() => onToggleFavorite(wod.id)} aria-label={t(favorite ? "favorite.remove" : "favorite.add", { name: wod.name })} aria-pressed={favorite}><Star size={18} fill={favorite ? "currentColor" : "none"} /></button></div>
          <h1>{wod.name}</h1>
          <p>{copy.description}</p>
          <div className="detail-meta"><span><Clock3 size={15} /> {copy.mode}</span><span><Gauge size={15} /> {t("detail.default", { minutes: wod.duration })}</span><Difficulty value={wod.difficulty} /></div>
        </div>
        <div className="detail-workout">
          <p className="eyebrow">{t("detail.prescription")}</p>
          <ol>{copy.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        </div>
      </header>
      <div className="detail-grid">
        <section className="panel body-panel"><div className="panel-heading"><div><p className="eyebrow">{t("detail.muscle")}</p><h2>{t("detail.lands")}</h2></div><Activity size={20} /></div><MuscleMap wod={wod} /></section>
        <section className="panel setup-panel">
          <div className="panel-heading"><div><p className="eyebrow">{t("detail.setup")}</p><h2>{t("detail.yours")}</h2></div><Settings size={20} /></div>
          <NumberControl value={minutes} onChange={setMinutes} min={1} max={180} label={t("detail.timer")} suffix={t("common.min")} hint={t("detail.official", { value: `${wod.duration} ${t("common.min")}` })} />
          <NumberControl value={rounds} onChange={setRounds} min={1} max={100} label={roundLabel} hint={t("detail.official", { value: wod.targetRounds || wod.defaultRounds || 1 })} />
          <NumberControl value={rpe} onChange={setRpe} min={1} max={10} label={t("detail.effort")} suffix="RPE" hint={t("detail.rpeHint")} />
          <div className="pace-preview"><span><TimerReset size={18} /> {t("detail.opening")}</span><strong>{formatClock(pace)}</strong><small>{t("detail.adaptiveCopy")}</small></div>
          <button className="primary-action wide" type="button" onClick={() => onStart(wod, { rounds, minutes, rpe })}><Play size={17} fill="currentColor" /> {t("detail.start", { name: wod.name })}</button>
        </section>
      </div>
      <div className="detail-bottom">
        <section className="panel"><p className="eyebrow">{t("detail.stimulus")}</p><h3>{copy.stimulus}</h3><p>{copy.scaling}</p></section>
        <section className="panel"><p className="eyebrow">{t("detail.equipment")}</p><div className="equipment-list">{(copy.equipment.length ? copy.equipment : [t("detail.none")]).map((item) => <span key={item}><Check size={13} /> {item}</span>)}</div></section>
        <section className="panel source-panel"><p className="eyebrow">{t("detail.source")}</p><p>{t("detail.sourceCopy", { source: copy.sourceLabel })}</p>{wod.sourceUrl && <button type="button" onClick={() => openExternal(wod.sourceUrl)}>{t("detail.openSource")} <ExternalLink size={13} /></button>}</section>
      </div>
    </div>
  );
}

function WorkoutRunner({ wod, config, profile, settings, onFinish, onCancel }) {
  const { t, wod: localizeWod } = useI18n();
  const copy = localizeWod(wod);
  const [status, setStatus] = useState("ready");
  const [elapsed, setElapsed] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [splits, setSplits] = useState([]);
  const startedAt = useRef(0);
  const accumulated = useRef(0);
  const lastSplitAt = useRef(0);
  const completed = useRef(false);
  const countdown = ["AMRAP", "EMOM", "Intervals"].includes(wod.mode);
  const totalSeconds = config.minutes * 60;

  const readElapsed = () => accumulated.current + (status === "running" ? (performance.now() - startedAt.current) / 1000 : 0);
  const playTone = (frequency = 760) => {
    if (!settings.sound) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.06, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.13);
    } catch { /* Audio is optional. */ }
  };

  const finalize = (finalRounds = rounds, finalElapsed = readElapsed(), finalSplits = splits) => {
    if (completed.current) return;
    completed.current = true;
    const cappedElapsed = countdown ? Math.min(totalSeconds, Math.max(1, finalElapsed)) : Math.max(1, finalElapsed);
    const counts = aggregateCounts(wod, finalRounds || (wod.fixedTotals ? config.rounds : 0), config.rounds);
    const record = {
      id: uid(), type: "wod", wodId: wod.id, name: wod.name, date: isoDay(), createdAt: Date.now(),
      durationSec: Math.round(cappedElapsed), rounds: finalRounds, targetRounds: config.rounds,
      calories: estimateCalories(wod.met, profile.weightKg, cappedElapsed / 60, config.rpe), rpe: config.rpe,
      counts, totalReps: totalReps(counts), splits: finalSplits.slice(), mode: wod.mode,
    };
    playTone(980);
    void window.KipsetNative?.haptic?.("success");
    onFinish(record);
  };

  useEffect(() => {
    if (status !== "running") return undefined;
    const timer = window.setInterval(() => {
      const value = accumulated.current + (performance.now() - startedAt.current) / 1000;
      setElapsed(value);
      if (countdown && value >= totalSeconds) finalize(rounds, totalSeconds);
    }, 80);
    return () => window.clearInterval(timer);
  }, [status, rounds, totalSeconds]);

  const start = () => {
    completed.current = false;
    startedAt.current = performance.now();
    setStatus("running");
    playTone(620);
    void window.KipsetNative?.haptic?.("light");
  };
  const pause = () => {
    if (status === "running") {
      accumulated.current = readElapsed();
      setElapsed(accumulated.current);
      setStatus("paused");
    } else if (status === "paused") {
      startedAt.current = performance.now();
      setStatus("running");
    }
  };
  const completeRound = () => {
    if (status !== "running") return;
    const nowElapsed = readElapsed();
    const split = nowElapsed - lastSplitAt.current;
    const nextRounds = rounds + 1;
    lastSplitAt.current = nowElapsed;
    const nextSplits = [...splits, split];
    setRounds(nextRounds);
    setSplits(nextSplits);
    playTone(760);
    void window.KipsetNative?.haptic?.("heavy");
    if (!countdown && nextRounds >= config.rounds) finalize(nextRounds, nowElapsed, nextSplits);
  };
  const undo = () => {
    if (!rounds || !splits.length) return;
    const next = splits.slice(0, -1);
    setSplits(next);
    setRounds((value) => Math.max(0, value - 1));
    lastSplitAt.current = next.reduce((sum, split) => sum + split, 0);
  };

  useEffect(() => {
    const handleKey = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === "Space") { event.preventDefault(); status === "ready" ? start() : completeRound(); }
      if (event.key.toLowerCase() === "p") pause();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [status, rounds, splits]);

  const shownSeconds = countdown ? Math.max(0, totalSeconds - elapsed) : elapsed;
  const currentSplit = Math.max(0, elapsed - (splits.reduce((sum, split) => sum + split, 0)));
  const adaptivePace = adaptiveRoundPace(totalSeconds, elapsed, config.rounds, rounds);
  const progress = countdown ? Math.min(1, elapsed / totalSeconds) : Math.min(1, rounds / config.rounds);

  return (
    <div className="runner-overlay" role="dialog" aria-modal="true" aria-label={`${wod.name} ${t("nav.workouts")}`}>
      <div className="runner-top"><div className="runner-brand"><Mark compact /><span>KIPSET</span></div><div><strong>{wod.name}</strong><small>{copy.mode} · {config.minutes} {t("common.min")} · {t("runner.target")} {config.rounds}</small></div><button type="button" onClick={onCancel} aria-label={t("runner.close")}><X size={20} /></button></div>
      <main className="runner-main">
        <section className="runner-clock" aria-label={countdown ? t("runner.timeLeft") : t("runner.elapsed")}>
          <p>{countdown ? t("runner.timeLeft") : t("runner.elapsed")}</p><strong>{formatClock(shownSeconds)}</strong>
          <div className="time-track"><i style={{ transform: `scaleX(${progress})` }} /></div>
        </section>
        <section className="runner-rounds"><p>{t("runner.rounds")}</p><div><strong key={rounds}>{rounds}</strong><span>/{config.rounds}</span></div></section>
        <section className="runner-pace">
          <div><span>{t("runner.current")}</span><strong>{formatClock(currentSplit)}</strong></div>
          <div className="pace-core"><small>{t("runner.next")}</small><strong>{formatClock(adaptivePace)}</strong><span>{rounds ? (splits.at(-1) < adaptivePace ? t("runner.banked") : t("runner.recover")) : t("runner.opening")}</span></div>
          <div><span>{t("runner.last")}</span><strong>{splits.length ? formatClock(splits.at(-1)) : "—"}</strong></div>
        </section>
        <section className="runner-movements" aria-label={t("runner.prescription")}>{copy.steps.map((step, index) => <div key={step}><span>{pad(index + 1)}</span><strong>{step}</strong></div>)}</section>
        <section className="runner-actions">
          {status === "ready" ? <button className="runner-start" type="button" onClick={start}><Play size={22} fill="currentColor" /> {t("runner.start")}</button> : <button className="runner-complete" type="button" onClick={completeRound} disabled={status !== "running"}><Check size={25} /> {t("runner.complete")}</button>}
          <button className="runner-control" type="button" onClick={pause} disabled={status === "ready"}>{status === "paused" ? <Play size={20} /> : <Pause size={20} />}<span>{status === "paused" ? t("runner.resume") : t("runner.pause")}</span></button>
          <button className="runner-control" type="button" onClick={undo} disabled={!rounds}><Undo2 size={20} /><span>{t("runner.undo")}</span></button>
          <button className="runner-control finish" type="button" onClick={() => finalize()} disabled={status === "ready"}><Square size={18} fill="currentColor" /><span>{t("runner.finish")}</span></button>
        </section>
        <p className="runner-shortcuts"><kbd>Space</kbd> {t("runner.shortcutRound")} <i /> <kbd>P</kbd> {t("runner.shortcutPause")}</p>
      </main>
    </div>
  );
}

function EmptyState({ icon: Icon, title, copy }) {
  return <div className="empty-state"><Icon size={25} /><strong>{title}</strong><p>{copy}</p></div>;
}

const drawCover = (context, image, width, height) => {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
};

const CANVAS_FONT = '"Segoe UI", "Malgun Gothic", "Yu Gothic UI", "Microsoft YaHei UI", Arial, sans-serif';
const fitCanvasText = (context, text, maxWidth, initial, weight = 800, minimum = Math.min(32, initial)) => {
  let size = initial;
  while (size > minimum) {
    context.font = `${weight} ${size}px ${CANVAS_FONT}`;
    if (context.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return size;
};

const imageToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
});

async function saveStory(record, backgroundId, i18n) {
  const { t, step, localeTag } = i18n;
  const background = BACKGROUNDS.find((item) => item.id === backgroundId) || BACKGROUNDS[0];
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1920;
  const context = canvas.getContext("2d");
  const image = new Image();
  image.src = `./backgrounds/${background.file}`;
  await new Promise((resolve) => { image.onload = resolve; image.onerror = resolve; });
  context.fillStyle = "#090a0c"; context.fillRect(0, 0, canvas.width, canvas.height);
  if (image.complete && image.naturalWidth) drawCover(context, image, canvas.width, canvas.height);
  context.fillStyle = "rgba(4,5,7,.72)"; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(8,9,11,.92)"; context.fillRect(56, 58, 968, 1804);
  context.strokeStyle = "rgba(255,255,255,.17)"; context.lineWidth = 2; context.strokeRect(56, 58, 968, 1804);
  context.fillStyle = "#ffffff"; context.fillRect(100, 106, 20, 66); context.fillRect(132, 84, 20, 88); context.fillStyle = "#d65a55"; context.fillRect(164, 98, 20, 74);
  context.fillStyle = "#ffffff"; context.font = `800 28px ${CANVAS_FONT}`; context.fillText("KIPSET", 208, 143);
  context.fillStyle = "#a4a8ae"; context.font = `700 20px ${CANVAS_FONT}`; context.fillText(t("result.complete"), 100, 286, 850);
  context.fillStyle = "#ffffff"; const titleSize = fitCanvasText(context, record.name.toUpperCase(), 850, 150, 900); context.font = `900 ${titleSize}px ${CANVAS_FONT}`; context.fillText(record.name.toUpperCase(), 96, 436);
  context.fillStyle = "#9da3ac"; context.font = `500 25px ${CANVAS_FONT}`; context.fillText(new Intl.DateTimeFormat(localeTag, { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${record.date}T12:00:00`)), 100, 506);
  context.strokeStyle = "rgba(255,255,255,.14)"; context.beginPath(); context.moveTo(100, 566); context.lineTo(980, 566); context.stroke();
  const metrics = [[formatClock(record.durationSec), t("result.total")], [String(record.rounds), t("result.rounds")], [String(record.calories), t("result.burn")]];
  metrics.forEach(([value, label], index) => {
    const x = 100 + index * 294;
    context.fillStyle = "#ffffff"; context.font = `800 62px ${CANVAS_FONT}`; context.fillText(value, x, 690, 250);
    context.fillStyle = "#858b94"; context.font = `700 17px ${CANVAS_FONT}`; context.fillText(label, x, 734, 250);
  });
  context.fillStyle = "#d65a55"; context.font = `700 18px ${CANVAS_FONT}`; context.fillText(t("result.work"), 100, 856);
  const entries = Object.entries(record.counts || {}).slice(0, 6);
  entries.forEach(([name, value], index) => {
    const column = index % 2; const row = Math.floor(index / 2); const x = 100 + column * 450; const y = 960 + row * 190;
    context.fillStyle = "rgba(255,255,255,.08)"; context.fillRect(x, y - 82, 408, 142);
    context.fillStyle = "#ffffff"; context.font = `800 48px ${CANVAS_FONT}`; context.fillText(String(value), x + 26, y - 17);
    const countLabel = step(name).toUpperCase();
    const countSize = fitCanvasText(context, countLabel, 350, 19, 700, 13);
    context.fillStyle = "#949aa3"; context.font = `700 ${countSize}px ${CANVAS_FONT}`; context.fillText(countLabel, x + 26, y + 25, 350);
  });
  context.strokeStyle = "rgba(255,255,255,.14)"; context.beginPath(); context.moveTo(100, 1652); context.lineTo(980, 1652); context.stroke();
  context.fillStyle = "#ffffff"; context.font = `800 24px ${CANVAS_FONT}`; context.fillText(t("result.receipt"), 100, 1732, 850);
  context.fillStyle = "#777d86"; context.font = `500 17px ${CANVAS_FONT}`; context.fillText(t("result.canvasNote"), 100, 1778, 850);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const fileName = `kipset-${record.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${record.date}.png`;
  if (window.KipsetNative?.saveImage) return window.KipsetNative.saveImage(await imageToDataUrl(blob), fileName);
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = fileName; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  return true;
}

function ResultView({ record, state, onBackground, onDone }) {
  const i18n = useI18n();
  const { t, step, localeTag } = i18n;
  const [saving, setSaving] = useState(false);
  const average = record.rounds ? record.durationSec / record.rounds : record.durationSec;
  const topCounts = Object.entries(record.counts || {}).slice(0, 6);
  const save = async () => { setSaving(true); try { await saveStory(record, state.settings.storyBackground, i18n); } finally { setSaving(false); } };
  return (
    <div className="result-overlay" role="dialog" aria-modal="true" aria-label={t("result.complete")}>
      <div className="result-sheet">
        <div className="result-brand"><Mark /><span>KIPSET</span><button type="button" onClick={onDone} aria-label={t("common.done")}><X size={20} /></button></div>
        <div className="result-kicker"><Trophy size={19} /><span>{t("result.complete")}</span></div>
        <h1>{record.name}</h1><p>{displayDate(record.date, localeTag, { year: "numeric" })}</p>
        <div className="result-metrics"><div><small>{t("result.total")}</small><strong>{formatClock(record.durationSec)}</strong></div><div><small>{t("result.rounds")}</small><strong>{record.rounds}<span>/{record.targetRounds}</span></strong></div><div><small>{t("result.average")}</small><strong>{formatClock(average)}</strong></div><div><small>{t("result.burn")}</small><strong>{record.calories}<span> {t("common.kcal")}</span></strong></div></div>
        <div className="result-counts">{topCounts.map(([name, value]) => <div key={name}><strong>{value}</strong><span>{step(name)}</span></div>)}</div>
        <div className="story-picker"><div><p className="eyebrow">{t("result.background")}</p><span>{BACKGROUNDS.find((item) => item.id === state.settings.storyBackground)?.name}</span></div><div className="background-row">{BACKGROUNDS.map((background) => <button key={background.id} type="button" className={state.settings.storyBackground === background.id ? "active" : ""} onClick={() => onBackground(background.id)} title={background.name} aria-label={background.name} aria-pressed={state.settings.storyBackground === background.id}><img src={`./backgrounds/${background.file}`} alt="" /></button>)}</div></div>
        <div className="result-actions"><button className="primary-action" type="button" disabled={saving} onClick={save}><Download size={17} /> {saving ? t("result.rendering") : t(window.KipsetNative?.platform === "android" ? "result.share" : "result.save")}</button><button className="secondary-action" type="button" onClick={onDone}>{t("common.done")}</button></div>
        <p className="estimate-note"><Info size={13} /> {t("result.note")}</p>
      </div>
    </div>
  );
}

function RunView({ state, onAddRun }) {
  const { t, localeTag } = useI18n();
  const [form, setForm] = useState({ date: isoDay(), distanceKm: 5, hours: 0, minutes: 30, seconds: 0, rpe: state.profile.defaultRpe || 7, notes: "" });
  const durationSec = Number(form.hours) * 3600 + Number(form.minutes) * 60 + Number(form.seconds);
  const speed = durationSec ? Number(form.distanceKm) / (durationSec / 3600) : 0;
  const met = runningMet(speed);
  const calories = estimateCalories(met, state.profile.weightKg, durationSec / 60, form.rpe);
  const pace = durationSec / Number(form.distanceKm || 0);
  const runs = state.logs.filter((log) => log.type === "run").sort((a, b) => b.createdAt - a.createdAt);
  const save = (event) => {
    event.preventDefault();
    if (!Number(form.distanceKm) || durationSec < 60) return;
    onAddRun({ id: uid(), type: "run", name: `${Number(form.distanceKm).toFixed(2).replace(/\.00$/, "")}K Run`, date: form.date, createdAt: Date.now(), distanceKm: Number(form.distanceKm), durationSec, paceSecPerKm: pace, speedKmh: speed, calories, rpe: Number(form.rpe), notes: form.notes.trim() });
    setForm((value) => ({ ...value, notes: "" }));
  };
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const totalDistance = runs.reduce((sum, run) => sum + Number(run.distanceKm || 0), 0);
  return (
    <div className="view-enter">
      <header className="page-header"><div><p className="eyebrow">{t("run.eyebrow")}</p><h1>{t("run.title")}</h1><p>{t("run.copy")}</p></div></header>
      <div className="run-layout">
        <form className="panel run-form" onSubmit={save}>
          <div className="panel-heading"><div><p className="eyebrow">{t("run.new")}</p><h2>{t("run.details")}</h2></div><Footprints size={21} /></div>
          <div className="form-grid"><label>{t("run.date")}<input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} required /></label><label>{t("run.distance")}<input type="number" min="0.1" max="500" step="0.01" value={form.distanceKm} onChange={(event) => update("distanceKm", event.target.value)} required /></label></div>
          <fieldset><legend>{t("run.duration")}</legend><label><span>{t("run.hours")}</span><input type="number" min="0" max="24" value={form.hours} onChange={(event) => update("hours", event.target.value)} /></label><label><span>{t("run.minutes")}</span><input type="number" min="0" max="59" value={form.minutes} onChange={(event) => update("minutes", event.target.value)} /></label><label><span>{t("run.seconds")}</span><input type="number" min="0" max="59" value={form.seconds} onChange={(event) => update("seconds", event.target.value)} /></label></fieldset>
          <label className="range-label"><span>{t("run.effort")} <b>RPE {form.rpe}</b></span><input type="range" min="1" max="10" value={form.rpe} onChange={(event) => update("rpe", event.target.value)} /></label>
          <label>{t("run.notes")}<textarea rows="3" maxLength="300" value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder={t("run.notesPlaceholder")} /></label>
          <div className="run-preview"><div><small>{t("run.pace")}</small><strong>{formatPace(pace)}</strong></div><div><small>{t("run.speed")}</small><strong>{speed ? speed.toFixed(1) : "—"}<span> km/h</span></strong></div><div><small>{t("run.burn")}</small><strong>{calories}<span> {t("common.kcal")}</span></strong></div></div>
          <button className="primary-action wide" type="submit"><Save size={17} /> {t("run.save")}</button>
          <p className="estimate-note"><Info size={13} /> {t("run.metNote")}</p>
        </form>
        <section className="run-side">
          <div className="run-summary"><StatCard icon={Footprints} label={t("run.total")} value={totalDistance.toFixed(1)} unit="km" /><StatCard icon={Activity} label={t("run.logged")} value={runs.length} unit={t("common.sessions")} /></div>
          <article className="panel"><div className="panel-heading"><div><p className="eyebrow">{t("run.history")}</p><h2>{t("run.recent")}</h2></div><History size={20} /></div>{runs.length ? runs.slice(0, 8).map((run) => <div className="run-row" key={run.id}><div><strong>{run.distanceKm.toFixed(2)} km</strong><small>{displayDate(run.date, localeTag)} · RPE {run.rpe}</small></div><div><strong>{formatClock(run.durationSec)}</strong><small>{formatPace(run.paceSecPerKm)} · {run.calories} {t("common.kcal")}</small></div></div>) : <EmptyState icon={Footprints} title={t("run.none")} copy={t("run.noneCopy")} />}</article>
        </section>
      </div>
    </div>
  );
}

function CalendarView({ logs, onDelete }) {
  const { t, localeTag } = useI18n();
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + days) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= days ? day : null;
  });
  const monthPrefix = `${year}-${pad(month + 1)}`;
  const monthLogs = logs.filter((log) => log.date.startsWith(monthPrefix));
  const grouped = Object.groupBy ? Object.groupBy(monthLogs, (log) => log.date) : monthLogs.reduce((map, log) => ({ ...map, [log.date]: [...(map[log.date] || []), log] }), {});
  const selectedToday = isoDay();
  return (
    <div className="view-enter">
      <header className="page-header"><div><p className="eyebrow">{t("calendar.eyebrow")}</p><h1>{t("calendar.title")}</h1><p>{t("calendar.copy")}</p></div></header>
      <section className="calendar-summary stat-grid"><StatCard icon={Activity} label={t("calendar.sessions")} value={monthLogs.length} unit={t("calendar.month")} /><StatCard icon={Flame} label={t("calendar.burn")} value={monthLogs.reduce((sum, log) => sum + Number(log.calories || 0), 0)} unit={t("common.kcal")} /><StatCard icon={Clock3} label={t("calendar.time")} value={Math.round(monthLogs.reduce((sum, log) => sum + Number(log.durationSec || 0), 0) / 60)} unit={t("common.minutes")} /><StatCard icon={Footprints} label={t("calendar.running")} value={monthLogs.filter((log) => log.type === "run").reduce((sum, log) => sum + Number(log.distanceKm || 0), 0).toFixed(1)} unit="km" /></section>
      <div className="calendar-layout">
        <section className="panel calendar-panel">
          <div className="calendar-head"><button type="button" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label={t("calendar.previous")}><ChevronLeft size={20} /></button><h2>{new Intl.DateTimeFormat(localeTag, { month: "long", year: "numeric" }).format(cursor)}</h2><button type="button" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label={t("calendar.next")}><ChevronRight size={20} /></button></div>
          <div className="weekday-row">{Array.from({ length: 7 }, (_, day) => new Intl.DateTimeFormat(localeTag, { weekday: "short" }).format(new Date(2024, 0, 7 + day)).toUpperCase()).map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
          <div className="calendar-grid">{cells.map((day, index) => {
            const date = day ? `${monthPrefix}-${pad(day)}` : ""; const dayLogs = grouped[date] || [];
            return <div key={`${day}-${index}`} className={`calendar-day ${date === selectedToday ? "today" : ""} ${!day ? "blank" : ""}`}><b>{day}</b>{dayLogs.slice(0, 3).map((log) => <span key={log.id} className={log.type}>{log.type === "run" ? `${log.distanceKm.toFixed(1)}K` : log.name}</span>)}{dayLogs.length > 3 && <small>+{dayLogs.length - 3} {t("common.more")}</small>}</div>;
          })}</div>
        </section>
        <section className="panel log-list"><div className="panel-heading"><div><p className="eyebrow">{t("calendar.details")}</p><h2>{t("calendar.count", { count: monthLogs.length })}</h2></div><BarChart3 size={20} /></div>{monthLogs.length ? monthLogs.slice().sort((a, b) => b.createdAt - a.createdAt).map((log) => { const name = log.type === "run" ? t("run.name", { distance: Number(log.distanceKm).toFixed(2).replace(/\.00$/, "") }) : log.name; return <div className="log-detail" key={log.id}><span className={`log-icon ${log.type}`}>{log.type === "run" ? <Footprints size={15} /> : <Dumbbell size={15} />}</span><div><strong>{name}</strong><small>{displayDate(log.date, localeTag)} · {formatClock(log.durationSec)} · {log.calories} {t("common.kcal")}</small></div><button type="button" onClick={() => onDelete(log.id)} aria-label={t("calendar.delete", { name })}><Trash2 size={15} /></button></div>; }) : <EmptyState icon={CalendarDays} title={t("calendar.open")} copy={t("calendar.openCopy")} />}</section>
      </div>
    </div>
  );
}

function ProfileView({ state, onUpdateProfile, onUpdateSettings, onImport, onClear }) {
  const { t } = useI18n();
  const [profile, setProfile] = useState(state.profile);
  const fileRef = useRef(null);
  const save = (event) => { event.preventDefault(); onUpdateProfile(profile); };
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString(), appVersion: APP_VERSION }, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `kipset-backup-${isoDay()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  const importFile = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { onImport(JSON.parse(await file.text())); } catch { alert(t("dialog.invalid")); }
    event.target.value = "";
  };
  return (
    <div className="view-enter">
      <header className="page-header"><div><p className="eyebrow">{t("profile.eyebrow")}</p><h1>{t("profile.title")}</h1><p>{t("profile.copy")}</p></div></header>
      <div className="profile-layout">
        <form className="panel profile-form" onSubmit={save}>
          <div className="panel-heading"><div><p className="eyebrow">{t("profile.athlete")}</p><h2>{t("profile.profile")}</h2></div><UserRound size={21} /></div>
          <label>{t("profile.name")}<input value={profile.name} maxLength="32" onChange={(event) => setProfile({ ...profile, name: event.target.value })} required /></label>
          <div className="form-grid"><label>{t("profile.age")}<input type="number" min="16" max="100" value={profile.age} onChange={(event) => setProfile({ ...profile, age: Number(event.target.value) })} /></label><label>{t("profile.experience")}<select value={profile.experience} onChange={(event) => setProfile({ ...profile, experience: event.target.value })}>{["Foundation", "Intermediate", "Advanced", "Competitive"].map((item) => <option key={item} value={item}>{t(`experience.${item}`)}</option>)}</select></label></div>
          <div className="form-grid"><label>{t("profile.weight")}<input type="number" min="30" max="250" step="0.1" value={profile.weightKg} onChange={(event) => setProfile({ ...profile, weightKg: Number(event.target.value) })} /></label><label>{t("profile.height")}<input type="number" min="120" max="230" value={profile.heightCm} onChange={(event) => setProfile({ ...profile, heightCm: Number(event.target.value) })} /></label></div>
          <label className="range-label"><span>{t("profile.effort")} <b>RPE {profile.defaultRpe}</b></span><input type="range" min="1" max="10" value={profile.defaultRpe} onChange={(event) => setProfile({ ...profile, defaultRpe: Number(event.target.value) })} /></label>
          <button className="primary-action" type="submit"><Save size={16} /> {t("profile.save")}</button>
        </form>
        <div className="settings-stack">
          <section className="panel settings-panel"><div className="panel-heading"><div><p className="eyebrow">{t("profile.preferencesEyebrow")}</p><h2>{t("profile.preferences")}</h2></div><Settings size={21} /></div>
            <label className="language-setting"><span><Library size={18} /><b>{t("profile.language")}</b><small>{t("profile.languageCopy")}</small></span><select value={state.settings.language || "en"} onChange={(event) => onUpdateSettings({ language: event.target.value })}>{LOCALES.map((locale) => <option key={locale.id} value={locale.id}>{locale.label}</option>)}</select></label>
            <button className="setting-row" type="button" onClick={() => onUpdateSettings({ monochrome: !state.settings.monochrome })} aria-pressed={state.settings.monochrome}><span>{state.settings.monochrome ? <Moon size={18} /> : <Sun size={18} />}<b>{t("profile.contrast")}</b><small>{t("profile.contrastCopy")}</small></span><i className={state.settings.monochrome ? "on" : ""} aria-hidden="true"><em /></i></button>
            <button className="setting-row" type="button" onClick={() => onUpdateSettings({ sound: !state.settings.sound })} aria-pressed={state.settings.sound}><span><Zap size={18} /><b>{t("profile.sound")}</b><small>{t("profile.soundCopy")}</small></span><i className={state.settings.sound ? "on" : ""} aria-hidden="true"><em /></i></button>
            <button className="setting-row" type="button" onClick={() => onUpdateSettings({ reducedMotion: !state.settings.reducedMotion })} aria-pressed={state.settings.reducedMotion}><span><Activity size={18} /><b>{t("profile.motion")}</b><small>{t("profile.motionCopy")}</small></span><i className={state.settings.reducedMotion ? "on" : ""} aria-hidden="true"><em /></i></button>
          </section>
          <section className="panel data-panel"><div className="panel-heading"><div><p className="eyebrow">{t("profile.data")}</p><h2>{t("profile.backup")}</h2></div><ShieldCheck size={21} /></div><p>{t("profile.backupCopy")}</p><div><button className="secondary-action" type="button" onClick={exportData}><Download size={16} /> {t("profile.export")}</button><button className="secondary-action" type="button" onClick={() => fileRef.current?.click()}><FileUp size={16} /> {t("profile.import")}</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={importFile} /></div><button className="danger-action" type="button" onClick={onClear}><Trash2 size={15} /> {t("profile.erase")}</button></section>
          <section className="panel legal-panel"><p className="eyebrow">{t("profile.about")}</p><h3>KIPSET {APP_VERSION}</h3><p>{t("profile.legal")}</p><button type="button" onClick={() => openExternal(CALORIE_SOURCES.compendium)}>{t("profile.met")} <ExternalLink size={13} /></button></section>
        </div>
      </div>
    </div>
  );
}

function App() {
  const deepLinkWod = WOD_BY_ID[new URLSearchParams(globalThis.location?.search || "").get("wod")] || null;
  const [state, setState] = useState(defaultState);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState(deepLinkWod ? "detail" : "home");
  const [selectedWod, setSelectedWod] = useState(deepLinkWod);
  const [runner, setRunner] = useState(null);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState("");
  const i18n = useMemo(() => createI18n(state.settings.language || "en"), [state.settings.language]);
  const { t } = i18n;

  useEffect(() => { loadState().then((loaded) => { setState({ ...defaultState, ...loaded, profile: { ...defaultState.profile, ...loaded.profile }, settings: { ...defaultState.settings, ...loaded.settings, language: requestedLanguage || loaded.settings?.language || defaultState.settings.language }, logs: Array.isArray(loaded.logs) ? loaded.logs : [], favorites: Array.isArray(loaded.favorites) ? loaded.favorites : defaultState.favorites }); setReady(true); }); }, []);
  useEffect(() => { if (!ready) return undefined; const timer = setTimeout(() => persistState(state), 250); return () => clearTimeout(timer); }, [state, ready]);
  useEffect(() => { document.documentElement.dataset.theme = state.settings.monochrome ? "mono" : "signal"; document.documentElement.dataset.motion = state.settings.reducedMotion ? "reduced" : "full"; document.documentElement.lang = i18n.locale; }, [state.settings, i18n.locale]);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(""), 2600); return () => clearTimeout(timer); }, [toast]);

  const navigate = (next) => { setSelectedWod(null); setView(next); window.scrollTo({ top: 0, behavior: state.settings.reducedMotion ? "auto" : "smooth" }); };
  const openWorkout = (wod) => { setSelectedWod(wod); setView("detail"); window.scrollTo(0, 0); };
  const toggleFavorite = (id) => setState((current) => ({ ...current, favorites: current.favorites.includes(id) ? current.favorites.filter((item) => item !== id) : [...current.favorites, id] }));
  const finishWorkout = (record) => { setState((current) => ({ ...current, logs: [...current.logs, record] })); setRunner(null); setResult(record); };
  const addRun = (record) => { setState((current) => ({ ...current, logs: [...current.logs, record] })); setToast(t("toast.run")); };
  const deleteLog = (id) => { if (!confirm(t("dialog.delete"))) return; setState((current) => ({ ...current, logs: current.logs.filter((log) => log.id !== id) })); };
  const clearData = () => { if (!confirm(t("dialog.erase"))) return; setState(defaultState); setToast(t("toast.erased")); };
  const importData = (loaded) => { if (!loaded || typeof loaded !== "object" || !Array.isArray(loaded.logs)) { alert(t("dialog.missing")); return; } setState({ ...defaultState, ...loaded, profile: { ...defaultState.profile, ...(loaded.profile || {}) }, settings: { ...defaultState.settings, ...(loaded.settings || {}) }, favorites: Array.isArray(loaded.favorites) ? loaded.favorites.filter((id) => WOD_BY_ID[id]) : [], logs: loaded.logs }); setToast(t("toast.imported")); };

  useEffect(() => {
    const handleNativeBack = (event) => {
      if (result) { event.preventDefault(); setResult(null); return; }
      if (runner) { event.preventDefault(); if (confirm(t("dialog.close"))) setRunner(null); return; }
      if (view === "detail") { event.preventDefault(); setSelectedWod(null); setView("library"); window.scrollTo(0, 0); return; }
      if (view !== "home") { event.preventDefault(); setSelectedWod(null); setView("home"); window.scrollTo(0, 0); }
    };
    window.addEventListener("kipset:native-back", handleNativeBack);
    return () => window.removeEventListener("kipset:native-back", handleNativeBack);
  }, [result, runner, view, t]);

  if (!ready) return <I18nContext.Provider value={i18n}><div className="boot-screen"><Mark /><span>KIPSET</span></div></I18nContext.Provider>;
  return (
    <I18nContext.Provider value={i18n}><div className="app-shell">
      <aside className="sidebar">
        <button className="brand-button" type="button" onClick={() => navigate("home")} aria-label={`KIPSET ${t("nav.home")}`}><Mark /><span>KIPSET</span></button>
        <nav aria-label={t("nav.primary")}>{navItems.map(([id, labelKey, Icon]) => { const active = view === id || (id === "library" && view === "detail"); return <button key={id} type="button" className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => navigate(id)}><Icon size={20} aria-hidden="true" /><span>{t(labelKey)}</span></button>; })}</nav>
        <div className="sidebar-foot"><button type="button" onClick={() => navigate("profile")}><span>{state.profile.name.slice(0, 2).toUpperCase()}</span><small>{state.profile.name}</small></button><b>v{APP_VERSION}</b></div>
      </aside>
      <main className="app-main">
        {view === "home" && <HomeView state={state} onOpenWorkout={openWorkout} onNavigate={navigate} />}
        {view === "library" && <LibraryView favorites={state.favorites} onOpenWorkout={openWorkout} onToggleFavorite={toggleFavorite} />}
        {view === "detail" && selectedWod && <WorkoutDetail wod={selectedWod} favorite={state.favorites.includes(selectedWod.id)} onBack={() => navigate("library")} onStart={(wod, config) => setRunner({ wod, config })} onToggleFavorite={toggleFavorite} />}
        {view === "run" && <RunView state={state} onAddRun={addRun} />}
        {view === "calendar" && <CalendarView logs={state.logs} onDelete={deleteLog} />}
        {view === "profile" && <ProfileView state={state} onUpdateProfile={(profile) => { setState((current) => ({ ...current, profile })); setToast(t("toast.profile")); }} onUpdateSettings={(settings) => setState((current) => ({ ...current, settings: { ...current.settings, ...settings } }))} onImport={importData} onClear={clearData} />}
      </main>
      {runner && <WorkoutRunner {...runner} profile={state.profile} settings={state.settings} onFinish={finishWorkout} onCancel={() => { if (confirm(t("dialog.close"))) setRunner(null); }} />}
      {result && <ResultView record={result} state={state} onBackground={(storyBackground) => setState((current) => ({ ...current, settings: { ...current.settings, storyBackground } }))} onDone={() => { setResult(null); navigate("calendar"); }} />}
      {toast && <div className="toast" role="status"><Check size={15} /> {toast}</div>}
    </div></I18nContext.Provider>
  );
}

createRoot(document.getElementById("root")).render(<App />);
