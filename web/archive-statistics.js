const trial = Object.freeze({
  firstGame: 'R1WzKV7VB',
  builds: [
    'hybrid:a6e68fb01fc11601eb82854e031c4294dc218c493a34bf253390fcad21e869b8',
    'stockfish:17c683d95bfafc1ae64b1d4b4d858f7e74738e876b409f89e25fcc9f34db6d68'
  ],
  policy: '7a702165ba92072006f99708a16aeb60508130d9044412a17a29ad526b04008e',
  elo0: 0, elo1: 5, alpha: 0.05, beta: 0.05
});
const scores = [0, 0.25, 0.5, 0.75, 1];
const sum = values => values.reduce((total, value) => total + value, 0);
const scoreAtElo = elo => 1 / (1 + 10 ** (-elo / 400));
const eloAtScore = score => 400 * Math.log10(score / (1 - score));
// Profile likelihood with the mean score constrained by each Elo hypothesis.
// See Fishtest's LLRcalc.py, and its reference on the multinomial likelihood.
function profileLogLikelihood(counts, mean) {
  const offsets = scores.map(score => score - mean);
  let lower = -1 / offsets[4], upper = -1 / offsets[0];
  for (let i = 0; i < 55; i++) {
    const mid = (lower + upper) / 2;
    const derivative = sum(counts.map((count,i) => count * offsets[i] / (1 + mid * offsets[i])));
    if (derivative > 0) lower = mid;
    else upper = mid;
  }
  const multiplier = (lower + upper) / 2;
  return -sum(counts.map((count,i) => count * Math.log1p(multiplier * offsets[i])));
}

function pairedStatistics(bins) {
  const pairs = sum(bins), {elo0,elo1,alpha,beta} = trial;
  const lower = Math.log(beta / (1-alpha)), upper = Math.log((1-beta) / alpha);
  const data = {pairs,bins,elo0,elo1,alpha,beta,lower,upper,elo:null,interval:null,los:null,llr:null};
  if (pairs < 2) return data;
  const mean = sum(bins.map((count,i) => count*scores[i])) / pairs;
  const variance = sum(bins.map((count,i) => count*(scores[i]-mean)**2)) / (pairs-1);
  // Small pseudo-counts stabilize the likelihood when a category is empty.
  const counts = bins.map(count=>count || 0.001);
  const llr = profileLogLikelihood(counts,scoreAtElo(elo1)) - profileLogLikelihood(counts,scoreAtElo(elo0));
  Object.assign(data,{llr,elo:mean>0&&mean<1?eloAtScore(mean):null});
  if (pairs < 10 || variance === 0) return data;
  const se = Math.sqrt(variance / pairs);
  const low = mean-1.959964*se, high = mean+1.959964*se;
  // Normal CDF approximation with maximum error below 8e-8.
  const z = (mean-0.5)/se;
  const t = 1/(1+0.2316419*Math.abs(z));
  const tail = Math.exp(-z*z/2)/Math.sqrt(2*Math.PI) * t *
    (0.31938153+t*(-0.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
  return {...data,interval:[low>0?eloAtScore(low):null,high<1?eloAtScore(high):null],los:z>=0?1-tail:tail};
}

const stcGames = `g.development IS NOT NULL AND g.timecontrol1='10s+0.1'
 AND g.finished IS NOT NULL AND g.state BETWEEN 1 AND 8`;
let snapshot, pending, expiresAt = 0;
async function archiveStatistics(db) {
  if (snapshot && Date.now() < expiresAt) return snapshot;
  if (pending) return pending;
  pending = db.query(`WITH show AS (
    SELECT g.state,g.created,g.development AS match,
      CASE WHEN g.result IS NULL THEN 1 WHEN g.result=(g.development->>'hybrid'='w') THEN 2 ELSE 0 END AS points
    FROM games g WHERE ${stcGames}
  ), pairs AS (
    SELECT SUM(points) AS bin FROM show WHERE created >= (SELECT created FROM games WHERE gameid=$1)
      AND match->'builds'=$2::jsonb AND match->>'policy'=$3
    GROUP BY match->>'pair'
    HAVING count(*)=2 AND count(DISTINCT match->>'opening')=1
      AND count(*) FILTER (WHERE match->>'leg'='1' AND match->>'hybrid'='w')=1
      AND count(*) FILTER (WHERE match->>'leg'='2' AND match->>'hybrid'='b')=1
  )
  SELECT (SELECT count(*)::int FROM show WHERE points=2) AS wins,
         (SELECT count(*)::int FROM show WHERE points=1) AS draws,
         (SELECT count(*)::int FROM show WHERE points=0) AS losses,
         (SELECT count(*)::int FROM show WHERE state=6 AND points<>1) AS flags,
         ARRAY(SELECT (SELECT count(*)::int FROM pairs WHERE bin=b) FROM generate_series(0,4) AS b ORDER BY b) AS bins`,
  [trial.firstGame,JSON.stringify(trial.builds),trial.policy]).then(({rows:[{bins,...totals}]})=>{
    const games = totals.wins+totals.draws+totals.losses;
    snapshot = {...totals,games,score:games?(totals.wins+0.5*totals.draws)/games:null,paired:pairedStatistics(bins)};
    expiresAt = Date.now()+12000;
    return snapshot;
  }).finally(()=>{pending=null;});
  return pending;
}
module.exports = {archiveStatistics,pairedStatistics,stcGames};
