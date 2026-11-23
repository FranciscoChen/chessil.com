'use strict';

// Numeric evidence and record identifiers are shared across every translation.
module.exports = [
 {
  slug: 'gigantua-move-generation', date: '2026-10-28',
  headings: [['Check', 'Result'], ['Prueba', 'Resultado'], ['测试', '结果']],
  rows: [
   [['Perft positions checked', 'Posiciones perft verificadas', '通过 perft 核对的局面'], '20'],
   [['Start position, depth 7', 'Posición inicial, profundidad 7', '初始局面，深度 7'], '3,195,901,860'],
   [['Search benchmark nodes, both builds', 'Nodos de búsqueda, ambas compilaciones', '两种构建的搜索节点数'], '2,389,370'],
   [['Median, baseline → hybrid (5 runs each)', 'Mediana, base → híbrido (5 por versión)', '中位耗时，基线 → 混合版（各 5 次）'], '3.393 s → 3.397 s'],
  ],
  evidence: ['46fad0b2 · perft-validation-46fad0b2.json · benchmark-46fad0b2.json', 'ff088020 · recovery'],
  sources: [['Gigantua', 'https://github.com/Gigantua/Gigantua'], ['Stockfish', 'https://github.com/official-stockfish/Stockfish']],
 },
 {
  slug: 'compact-policy-nnue', date: '2026-11-04',
  headings: [['First student validation', 'Result'], ['Validación del primer alumno', 'Resultado'], ['首个学生模型的验证指标', '结果']],
  rows: [
   [['Training / validation examples', 'Ejemplos de entrenamiento / validación', '训练 / 验证样本数'], '192,364 / 18,642'],
   [['Cross-entropy, uniform → student', 'Entropía cruzada, uniforme → alumno', '交叉熵，均匀分布 → 学生模型'], '3.472 → 2.954'],
   [['Reference move in top 1 / top 3', 'Jugada de referencia entre la primera / las tres primeras', '参考着法排在第 1 / 前 3'], '19.5% / 38.5%'],
  ],
  evidence: ['Stockfish-hybrid · policy/TRAINING-RESULTS.md · policy/STREAMING.md · policy/ARCHITECTURE-V3.md'],
  sources: [['Lc0 · AlphaZero primer', 'https://lczero.org/dev/lc0/search/alphazero/'], ['PGN Mentor', 'https://www.pgnmentor.com/files.html']],
 },
 {
  slug: 'incremental-policy-training', date: '2026-11-23',
  headings: [['Export / validation', 'Result'], ['Exportación / validación', 'Resultado'], ['导出与验证', '结果']],
  rows: [
   [['V4 widths tested', 'Anchuras V4 probadas', '已测试的 V4 宽度'], '128 / 256 / 512 / 1,024'],
   [['V4 batch 12465 (256), top 1 / top 3', 'V4 lote 12465 (256), acierto top 1 / top 3', 'V4 第 12465 批（256），前 1 / 前 3 命中率'], '29.5% / 54.7%'],
   [['V5 batch 10914, tie-aware top 1 / top 3', 'V5 lote 10914, top 1 con empates / top 3', 'V5 第 10914 批，并列计入的前 1 / 前 3 命中率'], '32.8% / 53.4%'],
   [['V4 / V5 256-unit exports', 'Exportaciones V4 / V5 de 256 unidades', 'V4 / V5（256 单元）导出大小'], '5,248,784 B / 11,547,920 B'],
   [['V5 sampling shares by piece count, low to high', 'Cuotas V5 por número de piezas, de menor a mayor', 'V5 按棋子数分组的采样比例，由少到多'], '15% / 30% / 35% / 20%'],
  ],
  evidence: ['INCREMENTAL-POLICY.md · v4-family-validation.json · POLICY-MATERIAL-V5.md', 'POLICY-ECONOMICAL-SEARCH.md · batch 12465', 'newnetwork-v5-256/progress.jsonl · accepted batch 10914'],
  sources: [['Lc0 · BT4 networks', 'https://lczero.org/play/networks/bestnets/']],
 },
 {
  slug: 'economical-policy-search', date: '2026-11-16',
  headings: [['Nine fixed-node samples per build', 'Earlier → economical'], ['Nueve muestras con nodos fijos por versión', 'Anterior → económica'], ['每种构建各 9 次固定节点测试', '旧版 → 节省推理版']],
  rows: [
   [['Total wall-clock time', 'Tiempo total transcurrido', '总实际耗时'], '7.658 s → 7.412 s'],
   [['Fresh quiet-policy calls', 'Inferencias nuevas para jugadas tranquilas', '非吃子阶段的新策略推理调用'], '17,583 → 7,530'],
   [['Elapsed time change', 'Cambio de tiempo', '耗时变化'], '−3.2%'],
  ],
  evidence: ['POLICY-ECONOMICAL-SEARCH.md · economical-search-validation.json', 'POLICY-LAZY-ACCUMULATOR.md · economical-lazy-validation.json'],
  sources: [['Stockfish · MovePicker', 'https://github.com/official-stockfish/Stockfish/blob/master/src/movepick.cpp']],
 },
 {
  slug: 'policy-guided-reductions', date: '2026-11-23',
  headings: [['Comparison', 'Games', 'W–D–L', 'Score', '95% Elo interval'], ['Comparación', 'Partidas', 'G–T–P', 'Puntuación', 'Intervalo Elo del 95%'], ['对照', '局数', '胜–和–负', '得分率', '95% Elo 区间']],
  rows: [
   [['Depth 6 vs. original Stockfish', 'Prof. 6 frente a Stockfish original', '深度 6 对原版 Stockfish'], '800', '238–342–220', '51.12%', '−2.9 … +18.6'],
   [['Depth 8 vs. depth 6', 'Prof. 8 frente a prof. 6', '深度 8 对深度 6'], '1,600', '459–700–441', '50.56%', '−3.9 … +11.7'],
   [['Depth 5 vs. depth 6', 'Prof. 5 frente a prof. 6', '深度 5 对深度 6'], '1,600', '451–683–466', '49.53%', '−11.3 … +4.7'],
  ],
  evidence: ['POLICY-MARGIN-LMR.md · depth-16 ablation (2026-11-22)', 'lmr-20261122T210140Z-DPOGGv · lmr-20261123T074053Z-SrCmQe · lmr-20261123T105824Z-1NzmDi'],
  sources: [['Stockfish · Fishtest', 'https://github.com/official-stockfish/fishtest']],
 },
];
