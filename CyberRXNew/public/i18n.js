/* Nerion i18n — UI-ONLY translation (Option B).
   The code stays English: variable names, metric keys, control IDs, API fields
   and all numbers/currency are never translated. Only the strings a user reads
   live here, as data, one entry per phrase with each language. nt(key, params)
   resolves the active language, falls back to English, then to the key itself.
   Sentences with values use {placeholders} so word order is correct per language
   (this is why French/Chinese/Japanese read naturally, not word-swapped).

   To add a language surface: add keys below and call nt('key') in the renderer.
   To add a whole new UI area: extend STR and use nt() where it builds strings. */
(function () {
  var LANGS = [['en', 'EN'], ['fr', 'FR'], ['zh', '中文'], ['ja', '日本語']];

  var STR = {
    // ---- Operating System tab (the first fully-translated surface) ----------
    'os.tab':        { en: 'Operating System', fr: 'Système d’exploitation', zh: '操作系统', ja: 'オペレーティングシステム' },
    'os.tab.desc':   { en: 'Act on the posture, and prove it worked.', fr: 'Agir sur la posture, et prouver que cela a fonctionné.', zh: '对安全态势采取行动，并证明其确实奏效。', ja: '姿勢に基づき行動し、その効果を証明する。' },
    'os.kick':       { en: 'The operating system, not the register', fr: 'Le système d’exploitation, pas le registre', zh: '操作系统，而非登记册', ja: '登録簿ではなく、オペレーティングシステム' },
    'os.verdict':    { en: 'A register records what is true. An operating system <span class="em">acts on it</span> — and proves the action worked.', fr: 'Un registre consigne ce qui est vrai. Un système d’exploitation <span class="em">agit en conséquence</span> — et prouve que l’action a fonctionné.', zh: '登记册记录事实。操作系统<span class="em">据此采取行动</span>——并证明行动奏效。', ja: '登録簿は事実を記録する。オペレーティングシステムは<span class="em">それに基づいて行動し</span>、その成果を証明する。' },
    'os.intro':      { en: 'Six things a compliance tool structurally cannot do: forecast with a scored track record, execute a decision and verify it, run standing operators, simulate the counterfactual, allocate capital by return, and learn from peers’ real outcomes.', fr: 'Six choses qu’un outil de conformité ne peut structurellement pas faire : prévoir avec un bilan chiffré, exécuter une décision et la vérifier, faire tourner des opérateurs permanents, simuler le contrefactuel, allouer le capital selon le rendement, et apprendre des résultats réels des pairs.', zh: '合规工具在结构上无法做到的六件事：以可评分的过往记录进行预测、执行决策并加以验证、运行常驻运营代理、进行反事实推演、按回报配置资本，以及从同业的真实结果中学习。', ja: 'コンプライアンスツールが構造的にできない六つのこと：採点可能な実績に基づく予測、意思決定の実行と検証、常設オペレーターの稼働、反実仮想のシミュレーション、リターンに基づく資本配分、そして同業他社の実際の結果からの学習。' },

    'os.track.t':    { en: 'Track record', fr: 'Bilan des prévisions', zh: '预测过往表现', ja: '予測の実績' },
    'os.track.sub':  { en: 'Whether our forecasts have actually held up — scored against what happened, not asserted.', fr: 'Nos prévisions ont-elles tenu — évaluées face aux faits, non simplement affirmées.', zh: '我们的预测是否经得起检验——以实际结果评分，而非空口断言。', ja: '予測が実際に的中したか——主張ではなく、起きた事実に照らして採点。' },
    'os.alloc.t':    { en: 'Capital allocation', fr: 'Allocation du capital', zh: '资本配置', ja: '資本配分' },
    'os.alloc.sub':  { en: 'Where the next dollar buys down the most risk — and where the curve flattens.', fr: 'Où le prochain dollar réduit le plus le risque — et où la courbe s’aplatit.', zh: '下一美元在何处能最大程度降低风险——以及曲线在何处趋平。', ja: '次の一ドルが最もリスクを下げる場所——そして曲線が平坦になる点。' },
    'os.sim.t':      { en: 'The counterfactual', fr: 'Le contrefactuel', zh: '反事实推演', ja: '反実仮想' },
    'os.sim.sub':    { en: 'What the portfolio looks like if you break one link — and which chained scenarios collapse with it.', fr: 'À quoi ressemble le portefeuille si vous brisez un maillon — et quels scénarios en chaîne s’effondrent avec lui.', zh: '若打断其中一环，风险组合将变成什么样——以及哪些连锁情景会随之瓦解。', ja: '一つの連鎖を断ち切った場合のポートフォリオ——そして連動して崩れる連鎖シナリオ。' },
    'os.ops.t':      { en: 'Autonomous operators', fr: 'Opérateurs autonomes', zh: '自主运营代理', ja: '自律オペレーター' },
    'os.ops.sub':    { en: 'What the standing agents handled inside their mandate, and what they escalated to you.', fr: 'Ce que les agents permanents ont traité dans leur mandat, et ce qu’ils vous ont remonté.', zh: '常驻代理在授权范围内处理了什么，以及将什么上报给您。', ja: '常設エージェントが権限内で処理した事項と、あなたに上申した事項。' },
    'os.act.t':      { en: 'Closed loop', fr: 'Boucle fermée', zh: '闭环', ja: 'クローズドループ' },
    'os.act.sub':    { en: 'Decisions that were executed — and whether telemetry has confirmed the risk actually fell.', fr: 'Décisions exécutées — et si la télémétrie a confirmé que le risque a réellement baissé.', zh: '已执行的决策——以及遥测数据是否已确认风险确实下降。', ja: '実行された意思決定——そしてリスクが実際に低下したことをテレメトリが確認したか。' },
    'os.peers.t':    { en: 'Peer outcomes', fr: 'Résultats des pairs', zh: '同业实际结果', ja: '同業他社の実績' },
    'os.peers.sub':  { en: 'What comparable institutions actually experienced, and the control that most often held.', fr: 'Ce que des institutions comparables ont réellement vécu, et le contrôle qui a le plus souvent tenu.', zh: '同类机构实际经历了什么，以及最常发挥作用的控制措施。', ja: '同規模の機関が実際に経験したこと、そして最も頻繁に有効だった管理策。' },

    'common.loading':     { en: 'Loading…', fr: 'Chargement…', zh: '加载中…', ja: '読み込み中…' },
    'common.unavailable': { en: 'Not available — the engine isn’t reachable from here right now.', fr: 'Indisponible — le moteur n’est pas joignable pour le moment.', zh: '暂不可用——当前无法连接到引擎。', ja: '利用できません——現在エンジンに接続できません。' },

    'os.track.pending':  { en: 'No forecast has come due yet. Predictions are recorded now; the track record forms as their horizons elapse and reconcile against what actually happened — no self-grading before the fact.', fr: 'Aucune prévision n’est encore arrivée à échéance. Les prévisions sont enregistrées dès maintenant ; le bilan se construit à mesure que leurs horizons arrivent à terme et sont rapprochés des faits réels — aucune auto-évaluation avant l’heure.', zh: '尚无预测到期。预测现已记录在案；随着各自的时间窗到期并与实际情况核对，过往记录逐步形成——绝不在事实发生前自我评分。', ja: 'まだ期日を迎えた予測はありません。予測は今すぐ記録され、各予測の期間が満了し実際の結果と照合されるにつれて実績が形成されます——事実の前に自己採点することはありません。' },
    'os.track.snapshot': { en: 'Record today’s forecast', fr: 'Enregistrer la prévision du jour', zh: '记录今日预测', ja: '本日の予測を記録' },
    'os.track.reconcile':{ en: 'Reconcile what’s due', fr: 'Rapprocher les échéances', zh: '核对到期项', ja: '期日到来分を照合' },
    'os.track.reconcileShort': { en: 'Reconcile', fr: 'Rapprocher', zh: '核对', ja: '照合' },
    'os.track.brier':    { en: 'Brier score · lower is better; 0.25 is a coin toss', fr: 'Score de Brier · plus bas est meilleur ; 0,25 = pile ou face', zh: 'Brier 评分 · 越低越好；0.25 相当于抛硬币', ja: 'ブライアスコア · 低いほど良い。0.25 はコイン投げ相当' },
    'os.track.calib':    { en: 'Calibration — forecast vs. actual (aligned = honest)', fr: 'Étalonnage — prévu vs. réel (alignés = honnête)', zh: '校准——预测 对 实际（吻合 = 诚实）', ja: '較正——予測 対 実績（一致 = 誠実）' },
    'os.track.fa':       { en: 'forecast {p}% · actual {o}%', fr: 'prévu {p}% · réel {o}%', zh: '预测 {p}% · 实际 {o}%', ja: '予測 {p}% · 実績 {o}%' },

    'os.alloc.budget':   { en: 'Budget', fr: 'Budget', zh: '预算', ja: '予算' },
    'os.alloc.optimize': { en: 'Optimize', fr: 'Optimiser', zh: '优化', ja: '最適化' },
    'os.alloc.frontier': { en: 'Efficient frontier — risk removed per dollar (green = funded within budget)', fr: 'Frontière efficiente — risque éliminé par dollar (vert = financé dans le budget)', zh: '有效前沿——每美元消除的风险（绿色 = 预算内已拨款）', ja: '効率的フロンティア——1ドルあたりの削減リスク（緑 = 予算内で手当済み）' },

    'os.sim.none':       { en: 'No open decisions to model.', fr: 'Aucune décision ouverte à modéliser.', zh: '没有可建模的未决决策。', ja: 'モデル化する未決の意思決定はありません。' },
    'os.sim.run':        { en: 'Model breaking these links', fr: 'Simuler la rupture de ces maillons', zh: '模拟打断这些环节', ja: 'これらの連鎖を断つ影響を試算' },

    'os.ops.run':        { en: 'Run the operators now', fr: 'Lancer les opérateurs maintenant', zh: '立即运行运营代理', ja: '今すぐオペレーターを実行' },
    'os.ops.none':       { en: 'No runs yet. Each operator drafts the recommended call, acts on what sits inside its mandate, and escalates the rest to you — every action logged to the ledger.', fr: 'Aucune exécution pour l’instant. Chaque opérateur rédige la recommandation, agit sur ce qui relève de son mandat et vous remonte le reste — chaque action est consignée au registre.', zh: '尚无运行记录。每个运营代理草拟建议决策、处理其授权范围内的事项，并将其余事项上报给您——每一项操作都记入台账。', ja: 'まだ実行記録はありません。各オペレーターは推奨案を起案し、権限内の事項に対応し、それ以外はあなたに上申します——すべての操作は台帳に記録されます。' },
    'os.ops.reviewed':   { en: 'reviewed', fr: 'examinés', zh: '已审阅', ja: '確認' },
    'os.ops.acted':      { en: 'acted', fr: 'traités', zh: '已处置', ja: '対応' },
    'os.ops.escalated':  { en: 'escalated', fr: 'remontés', zh: '已上报', ja: '上申' },

    'os.act.none':       { en: 'Nothing actuated yet. When a decision is executed it dispatches to the tool of record, then re-reads telemetry to confirm the residual risk actually fell — it never claims a fix on assertion alone.', fr: 'Rien n’a encore été actionné. Lorsqu’une décision est exécutée, elle est transmise à l’outil de référence, puis la télémétrie est relue pour confirmer que le risque résiduel a réellement baissé — jamais une correction affirmée sur parole.', zh: '尚未执行任何操作。当决策被执行时，会下发至相应的系统，随后重新读取遥测数据以确认残余风险确实下降——绝不仅凭声明就宣称已修复。', ja: 'まだ何も実行されていません。意思決定が実行されると記録用ツールへ送られ、その後テレメトリを再取得して残存リスクが実際に低下したことを確認します——主張だけで是正済みとすることはありません。' },
    'os.act.verify':     { en: 'Re-read telemetry & verify', fr: 'Relire la télémétrie et vérifier', zh: '重新读取遥测并核实', ja: 'テレメトリを再取得して検証' },

    'os.peers.hit':      { en: 'how often comparable institutions were hit', fr: 'fréquence à laquelle des institutions comparables ont été touchées', zh: '同类机构受影响的频率', ja: '同規模の機関が被害を受けた頻度' },
    'os.peers.control':  { en: 'the control that most often held', fr: 'le contrôle qui a le plus souvent tenu', zh: '最常发挥作用的控制措施', ja: '最も頻繁に有効だった管理策' },
    'os.peers.cohort':   { en: 'Cohort:', fr: 'Cohorte :', zh: '对照组：', ja: 'コホート：' },
    'os.peers.anon':     { en: '{n} anonymized outcomes · no institution is identifiable', fr: '{n} résultats anonymisés · aucune institution identifiable', zh: '{n} 条匿名结果 · 无法识别任何机构', ja: '{n} 件の匿名化された結果 · いかなる機関も特定不可' },
    'os.peers.contribute': { en: 'Contribute our anonymized outcomes', fr: 'Contribuer nos résultats anonymisés', zh: '贡献我们的匿名结果', ja: '当社の匿名化結果を提供' },

    'os.rib.cal':   { en: 'Forecast calibration', fr: 'Étalonnage des prévisions', zh: '预测校准', ja: '予測較正' },
    'os.rib.red':   { en: 'Reducible risk', fr: 'Risque réductible', zh: '可降低风险', ja: '削減可能リスク' },
    'os.rib.ops':   { en: 'Operator actions', fr: 'Actions des opérateurs', zh: '代理执行数', ja: 'オペレーター対応数' },
    'os.rib.peer':  { en: 'Peer base rate', fr: 'Taux de base des pairs', zh: '同业基准率', ja: '同業基準率' },
    'os.leg.pred':  { en: 'mean forecast', fr: 'prévision moyenne', zh: '平均预测', ja: '平均予測' },
    'os.leg.obs':   { en: 'observed', fr: 'observé', zh: '实际观测', ja: '実測' },
    'os.alloc.reducible': { en: 'reducible', fr: 'réductible', zh: '可降低', ja: '削減可能' },
    'os.act.ledger':{ en: 'Decision ledger — executed &amp; verified', fr: 'Registre des décisions — exécutées et vérifiées', zh: '决策台账——已执行并核实', ja: '意思決定台帳——実行・検証済み' },
    'os.act.chain': { en: 'chain intact', fr: 'chaîne intacte', zh: '链完整', ja: 'チェーン正常' },
    'os.act.pending':{ en: 'pending', fr: 'en attente', zh: '待定', ja: '保留中' },
    'os.act.c1':    { en: 'Decision', fr: 'Décision', zh: '决策', ja: '意思決定' },
    'os.act.c2':    { en: 'Dispatched to', fr: 'Transmis à', zh: '下发至', ja: '送信先' },
    'os.act.c3':    { en: 'Status', fr: 'Statut', zh: '状态', ja: '状態' },
    'os.act.c4':    { en: 'Residual risk', fr: 'Risque résiduel', zh: '残余风险', ja: '残存リスク' },
    'os.ops.across':{ en: 'across {n} recent runs', fr: 'sur {n} exécutions récentes', zh: '基于最近 {n} 次运行', ja: '直近 {n} 回の実行に基づく' }
  };

  function lang() { try { return localStorage.getItem('cyberrx_lang') || 'en'; } catch (_) { return 'en'; } }
  function nt(key, params) {
    var e = STR[key]; var s = e ? (e[lang()] || e.en || key) : key;
    if (params) { for (var k in params) { if (Object.prototype.hasOwnProperty.call(params, k)) s = s.split('{' + k + '}').join(params[k]); } }
    return s;
  }
  function setLang(code) {
    try { localStorage.setItem('cyberrx_lang', code); } catch (_) {}
    try { document.documentElement.setAttribute('lang', code); } catch (_) {}
    try { if (typeof render === 'function' && typeof CUR !== 'undefined') render(CUR); } catch (_) {}
    paint();
  }
  function paint() {
    var el = document.getElementById('nlangbar'); if (!el) return; var cur = lang();
    el.innerHTML = LANGS.map(function (l) {
      var on = l[0] === cur;
      return '<button data-nlang="' + l[0] + '" style="border:none;background:' + (on ? '#E7B24E' : 'transparent') + ';color:' + (on ? '#0b0f16' : '#98A6B8') + ';font-family:inherit;font-weight:600;font-size:11px;line-height:1;border-radius:99px;padding:5px 10px;cursor:pointer">' + l[1] + '</button>';
    }).join('');
  }
  function mount() {
    if (document.getElementById('nlangbar')) return;
    var bar = document.createElement('div'); bar.id = 'nlangbar';
    bar.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:9000;display:flex;gap:2px;background:rgba(16,24,39,.92);backdrop-filter:blur(8px);border:1px solid #26344A;border-radius:99px;padding:3px;box-shadow:0 6px 20px rgba(0,0,0,.4)';
    document.body.appendChild(bar); paint();
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-nlang]'); if (b) setLang(b.getAttribute('data-nlang')); });
  if (document.readyState !== 'loading') mount(); else document.addEventListener('DOMContentLoaded', mount);

  // Expose as nt() (avoids clobbering any existing single-letter helper).
  window.nt = nt; window.nerionLang = lang; window.nerionSetLang = setLang;
})();
