export const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

export const getIntensityFactor = (rpe) => 0.8 + (clamp(rpe, 1, 10) / 10) * 0.35;

export const estimateCalories = (met, weightKg, minutes, rpe = 7) => Math.max(0, Math.round(
  Number(met || 6.5) * 3.5 * clamp(weightKg, 30, 250) / 200 * Math.max(0, Number(minutes) || 0) * getIntensityFactor(rpe),
));

export const runningMet = (speedKmh) => {
  const speed = Number(speedKmh) || 0;
  if (speed < 6.4) return 6.0;
  if (speed < 7.7) return 7.8;
  if (speed < 8.5) return 8.5;
  if (speed < 9.5) return 9.0;
  if (speed < 10.5) return 9.3;
  if (speed < 11.2) return 10.5;
  if (speed < 11.8) return 11.0;
  if (speed < 12.6) return 11.8;
  if (speed < 13.4) return 12.0;
  if (speed < 14.2) return 12.5;
  if (speed < 15.3) return 13.0;
  return 14.8;
};

export const aggregateCounts = (wod, rounds, targetRounds) => {
  const counts = {};
  if (wod.perRound) {
    Object.entries(wod.perRound).forEach(([movement, reps]) => { counts[movement] = Math.round(Number(reps) * Number(rounds)); });
    return counts;
  }
  if (wod.fixedTotals) {
    const baseRounds = Math.max(1, wod.defaultRounds || targetRounds || 1);
    const ratio = Math.min(1, Number(rounds) / Math.max(1, targetRounds || baseRounds));
    Object.entries(wod.fixedTotals).forEach(([movement, reps]) => { counts[movement] = Math.round(Number(reps) * ratio); });
  }
  return counts;
};

export const totalReps = (counts) => Object.entries(counts).reduce(
  (sum, [name, value]) => /\(m\)|\(sec\)/.test(name) ? sum : sum + Number(value || 0),
  0,
);

export const adaptiveRoundPace = (totalSeconds, elapsedSeconds, targetRounds, completedRounds) => {
  const remainingRounds = Math.max(1, Number(targetRounds) - Number(completedRounds));
  return Math.max(0, Number(totalSeconds) - Number(elapsedSeconds)) / remainingRounds;
};
