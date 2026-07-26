/* Nerion i18n — UI translation, retrofit runtime model.
   The code stays English (variable names, metric keys, control IDs, API fields and
   all numbers/currency are never translated). Two layers:
     1) nt(key,params)/c5osT — key-based strings for surfaces authored with i18n in mind
        (the Operating System view). Kept as-is.
     2) A RUNTIME DOM TRANSLATOR — a phrase dictionary + a pass that rewrites visible text
        after every render, so the rest of the cockpit (which is authored in English) is
        localized without wrapping thousands of call sites. Numbers stay verbatim via the
        '#' placeholder, so "34 of 106 controls assessed" localizes with its figures intact.
   To extend coverage: add entries to DICT below (English → [fr, zh, ja]). Use '#' where a
   number appears so one entry covers every value. */
(function () {
  var LANGS = [['en', 'EN'], ['fr', 'FR'], ['zh', '中文'], ['ja', '日本語']];
  // Index into the DICT arrays, which are [fr, zh, ja] (no English slot — English is the source).
  var LI = { fr: 0, zh: 1, ja: 2 };

  // ---- Key-based strings (Operating System surface) ----------------------------
  var STR = {
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
    'os.peers.contribute': { en: 'Contribute our anonymized outcomes', fr: 'Contribuer nos résultats anonymisés', zh: '贡献我们的匿名结果', ja: '当社の匿名化結果を提供' }
  };

  /* ---- RUNTIME DICTIONARY --------------------------------------------------------
     English phrase → [fr, zh, ja]. '#' stands in for any number so one entry covers
     every value (figures are re-inserted verbatim, never translated). Whole-phrase
     matches only — safest against fragmenting sentences with inline markup. */
  var DICT = {
    // Top bar / chrome
    '⚠ War Room': ['⚠ Cellule de crise', '⚠ 作战室', '⚠ 作戦室'],
    '📋 Board Pack': ['📋 Dossier du conseil', '📋 董事会材料', '📋 取締役会向け資料'],
    'Board Pack': ['Dossier du conseil', '董事会材料', '取締役会向け資料'],
    '📄 Documents reviewed': ['📄 Documents examinés', '📄 已审阅文档', '📄 レビュー済み文書'],
    'Documents reviewed': ['Documents examinés', '已审阅文档', 'レビュー済み文書'],
    '↻ Recompute': ['↻ Recalculer', '↻ 重新计算', '↻ 再計算'],
    'Demo · sample data': ['Démo · données d’exemple', '演示 · 示例数据', 'デモ · サンプルデータ'],
    'Provable Cyber & AI Assurance': ['Assurance cyber et IA prouvable', '可证明的网络与人工智能保障', '証明可能なサイバー・AI保証'],
    'Executive cockpit': ['Cockpit exécutif', '高管驾驶舱', 'エグゼクティブ・コックピット'],
    // Section tabs
    'Program health': ['Santé du programme', '项目健康度', 'プログラムの健全性'],
    'Operational impact': ['Impact opérationnel', '运营影响', '業務影響'],
    'Decisions': ['Décisions', '决策', '意思決定'],
    // Framework tabs
    'NIST CSF 2.0': ['NIST CSF 2.0', 'NIST CSF 2.0', 'NIST CSF 2.0'],
    'ISO 27001': ['ISO 27001', 'ISO 27001', 'ISO 27001'],
    'CIS Controls': ['Contrôles CIS', 'CIS 控制项', 'CIS コントロール'],
    'AI frameworks': ['Cadres IA', '人工智能框架', 'AIフレームワーク'],
    'Confirm queue': ['File de confirmation', '确认队列', '確認キュー'],
    'Neuron Controls': ['Contrôles Neuron', 'Neuron 控制项', 'Neuron コントロール'],
    'NIST AI RMF': ['NIST AI RMF', 'NIST AI RMF', 'NIST AI RMF'],
    // KPI card labels + sublabels
    'Controls not met': ['Contrôles non satisfaits', '未达标控制项', '未達成のコントロール'],
    'Coverage': ['Couverture', '覆盖率', 'カバレッジ'],
    'Trend · vs last cycle': ['Tendance · vs cycle précédent', '趋势 · 对比上一周期', '傾向 · 前サイクル比'],
    'Overall maturity': ['Maturité globale', '整体成熟度', '総合成熟度'],
    'Attestation coverage': ['Couverture des attestations', '认证覆盖率', '証明カバレッジ'],
    'Controls below target': ['Contrôles sous la cible', '低于目标的控制项', '目標未満のコントロール'],
    'Domains below target': ['Domaines sous la cible', '低于目标的领域', '目標未満のドメイン'],
    'Controls failing': ['Contrôles en échec', '失效的控制项', '失敗しているコントロール'],
    'nothing a sensor or attestation marks as failing': ['aucun capteur ni attestation ne les signale en échec', '没有任何传感器或认证将其标记为失效', 'センサーや証明が失敗と示すものはありません'],
    'a sensor or attestation marks these failing': ['un capteur ou une attestation les signale en échec', '传感器或认证将其标记为失效', 'センサーまたは証明がこれらを失敗と示しています'],
    '# of # controls assessed': ['# contrôles évalués sur #', '已评估 # 项控制项，共 # 项', '# 件中 # 件のコントロールを評価済み'],
    '# improved · # regressed': ['# améliorés · # en recul', '# 项改善 · # 项退步', '# 件改善 · # 件低下'],
    'unchanged': ['inchangé', '无变化', '変化なし'],
    'under CMMI 3.5': ['sous CMMI 3,5', '低于 CMMI 3.5', 'CMMI 3.5 未満'],
    'maturity under CMMI 3.5': ['maturité sous CMMI 3,5', '成熟度低于 CMMI 3.5', 'CMMI 3.5 未満の成熟度'],
    '# / # controls attested': ['# contrôles attestés sur #', '已认证 # 项控制项，共 # 项', '# 件中 # 件のコントロールを証明済み'],
    'view ›': ['voir ›', '查看 ›', '表示 ›'],
    'explain ›': ['expliquer ›', '说明 ›', '説明 ›'],
    'computed': ['calculé', '已计算', '計算済み'],
    // Instrument / gauge
    'Maturity vs 3.5 target': ['Maturité vs cible 3,5', '成熟度 对 3.5 目标', '成熟度 対 目標3.5'],
    'weakest first': ['les plus faibles d’abord', '最薄弱者优先', '弱い順'],
    'click a function ›': ['cliquez sur une fonction ›', '点击某项功能 ›', '機能をクリック ›'],
    'click a control ›': ['cliquez sur un contrôle ›', '点击某项控制 ›', 'コントロールをクリック ›'],
    'all controls ›': ['tous les contrôles ›', '全部控制项 ›', 'すべてのコントロール ›'],
    'show all controls ›': ['afficher tous les contrôles ›', '显示全部控制项 ›', 'すべてのコントロールを表示 ›'],
    // Scope
    'Enterprise': ['Entreprise', '企业整体', '全社'],
    '● now viewing': ['● en cours de consultation', '● 当前查看', '● 表示中'],
    '↑ roll-up — click to view': ['↑ consolidation — cliquer pour voir', '↑ 汇总——点击查看', '↑ ロールアップ — クリックで表示'],
    '◆ weakest — focus here': ['◆ le plus faible — à cibler', '◆ 最薄弱——重点关注', '◆ 最弱 — ここに注力'],
    'consolidated · all regions': ['consolidé · toutes les régions', '合并 · 所有地区', '統合 · 全地域'],
    '★ Enterprise': ['★ Entreprise', '★ 企业整体', '★ 全社'],
    '◆ Region': ['◆ Région', '◆ 地区', '◆ 地域'],
    '▸ Entity': ['▸ Entité', '▸ 实体', '▸ エンティティ'],
    // CMMI levels
    'Non-existent': ['Inexistant', '不存在', '存在しない'],
    'Initial': ['Initial', '初始', '初期'],
    'Repeatable': ['Reproductible', '可重复', '反復可能'],
    'Defined': ['Défini', '已定义', '定義済み'],
    'Managed': ['Géré', '已管理', '管理された'],
    'Optimizing': ['En optimisation', '持续优化', '最適化'],
    // Common drill / detail
    '‹ Back to summary': ['‹ Retour au résumé', '‹ 返回摘要', '‹ 概要に戻る'],
    'How it was tested': ['Comment cela a été testé', '如何进行测试', 'テスト方法'],
    'How it was assessed': ['Comment cela a été évalué', '如何进行评估', '評価方法'],
    'Finding': ['Constat', '发现', '所見'],
    'Recommendation': ['Recommandation', '建议', '推奨事項'],
    'Risk it mitigates': ['Risque qu’il atténue', '所缓解的风险', '緩和するリスク'],
    'Why this score': ['Pourquoi ce score', '评分依据', 'このスコアの理由'],
    'Evidence source': ['Source de preuve', '证据来源', '証拠の出所'],
    'Evidence basis': ['Base de preuve', '证据基础', '証拠の根拠'],
    'Scoring': ['Notation', '评分方法', '採点方法'],
    'Cross-framework': ['Inter-référentiel', '跨框架映射', 'フレームワーク横断'],
    'Can you prove it?': ['Pouvez-vous le prouver ?', '你能证明吗？', '証明できますか？'],
    // Verdict words
    'Proven': ['Prouvé', '已证明', '実証済み'],
    'Human-confirmed': ['Confirmé par un humain', '人工确认', '人手で確認済み'],
    'Asserted': ['Déclaré', '声明', '申告'],
    'Unproven': ['Non prouvé', '未证明', '未実証'],
    'Assessment cadence': ['Cadence d’évaluation', '评估频率', '評価サイクル'],
    // Decisions
    'Commit & fund': ['Engager et financer', '承诺并拨款', '承認して資金化'],
    'Defer to next cycle': ['Reporter au cycle suivant', '推迟至下一周期', '次サイクルへ延期'],
    // NIST CSF / AI RMF function names (bar-ledger + trees)
    'Govern': ['Gouverner', '治理', 'ガバナンス'],
    'Identify': ['Identifier', '识别', '識別'],
    'Protect': ['Protéger', '保护', '防御'],
    'Detect': ['Détecter', '检测', '検知'],
    'Respond': ['Répondre', '响应', '対応'],
    'Recover': ['Récupérer', '恢复', '復旧'],
    'GOVERN': ['GOUVERNER', '治理', 'ガバナンス'],
    'MAP': ['CARTOGRAPHIER', '映射', 'マップ'],
    'MEASURE': ['MESURER', '度量', '測定'],
    'MANAGE': ['GÉRER', '管理', '管理'],
    // Target / verdict phrases (finding fragments that are their own nodes)
    'below the 3.5 target': ['sous la cible de 3,5', '低于 3.5 的目标', '目標3.5を下回る'],
    'at the 3.5 target': ['à la cible de 3,5', '达到 3.5 的目标', '目標3.5に到達'],
    'target 3.5': ['cible 3,5', '目标 3.5', '目標 3.5'],
    'weakest — focus here': ['le plus faible — à cibler', '最薄弱——重点关注', '最弱 — ここに注力'],
    // Common section headings / labels
    'Function profile': ['Profil par fonction', '各功能概况', '機能別プロファイル'],
    'Control profile': ['Profil par contrôle', '各控制项概况', 'コントロール別プロファイル'],
    'Domain profile': ['Profil par domaine', '各领域概况', 'ドメイン別プロファイル'],
    'Peer benchmark': ['Comparaison avec les pairs', '同业对标', '同業ベンチマーク'],
    'Preview ›': ['Aperçu ›', '预览 ›', 'プレビュー ›'],
    'Controls': ['Contrôles', '控制项', 'コントロール'],
    'Drift': ['Dérive', '偏移', 'ドリフト'],
    'Summary': ['Résumé', '摘要', '概要'],
    'close ×': ['fermer ×', '关闭 ×', '閉じる ×'],
    'hide ›': ['masquer ›', '隐藏 ›', '非表示 ›'],
    // Verdict states
    'met': ['satisfait', '达标', '達成'],
    'partially met': ['partiellement satisfait', '部分达标', '一部達成'],
    'not met': ['non satisfait', '未达标', '未達成'],
    'not assessed': ['non évalué', '未评估', '未評価'],
    'live': ['en direct', '实时', 'ライブ'],
    'hybrid': ['hybride', '混合', 'ハイブリッド'],
    'attestation': ['attestation', '认证声明', '証明'],
    'awaiting': ['en attente', '等待中', '待機中'],
    // Op impact + decisions common
    'Recovery': ['Reprise', '恢复', '復旧'],
    'What needs your sign-off?': ['Qu’attend votre validation ?', '哪些需要您签署？', '承認が必要な事項は？'],
    'No control is failing outright': ['Aucun contrôle n’est en échec net', '没有任何控制项彻底失效', '完全に失敗しているコントロールはありません'],
    // Neuron
    'Prevention control': ['Contrôle de prévention', '预防型控制', '防御コントロール'],
    'Detection control': ['Contrôle de détection', '检测型控制', '検知コントロール'],
    'Prevention & detection control': ['Contrôle de prévention et détection', '预防与检测型控制', '防御・検知コントロール']
  };

  // ---- Key-based resolver (unchanged API) ----
  function lang() { try { return localStorage.getItem('cyberrx_lang') || 'en'; } catch (_) { return 'en'; } }
  function nt(key, params) {
    var e = STR[key]; var s = e ? (e[lang()] || e.en || key) : key;
    if (params) { for (var k in params) { if (Object.prototype.hasOwnProperty.call(params, k)) s = s.split('{' + k + '}').join(params[k]); } }
    return s;
  }

  // ---- Runtime phrase translator ----
  function pickLang() { var l = lang(); return LI[l] != null ? l : 'en'; }
  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  // Translate one visible string; returns null if no entry (leave English in place).
  function trPhrase(text) {
    var l = pickLang(); if (l === 'en') return null;
    var i = LI[l]; var n = norm(text);
    if (!n) return null;
    var e = DICT[n];
    if (e && e[i]) return preserveEdges(text, n, e[i]);
    // number template: replace digit runs (with optional %/comma/dot) by '#'
    var nums = []; var tpl = n.replace(/\d[\d.,]*%?/g, function (m) { nums.push(m); return '#'; });
    if (tpl !== n) {
      var te = DICT[tpl];
      if (te && te[i]) { var out = te[i]; var k = 0; out = out.replace(/#/g, function () { return nums[k] !== undefined ? nums[k++] : '#'; }); return preserveEdges(text, n, out); }
    }
    return null;
  }
  // Keep any leading/trailing whitespace the original text node carried.
  function preserveEdges(orig, trimmed, translated) {
    var lead = orig.match(/^\s*/)[0], trail = orig.match(/\s*$/)[0];
    return lead + translated + trail;
  }

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };
  function applyTo(root) {
    if (pickLang() === 'en') return;
    root = root || document.body; if (!root) return;
    // text nodes
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var batch = [], node;
    while ((node = walker.nextNode())) {
      var p = node.parentNode; if (!p || SKIP_TAGS[p.nodeName]) continue;
      if (p.id === 'nlangbar' || (p.closest && p.closest('#nlangbar'))) continue;
      var t = trPhrase(node.nodeValue);
      if (t != null && t !== node.nodeValue) batch.push([node, t]);
    }
    for (var b = 0; b < batch.length; b++) batch[b][0].nodeValue = batch[b][1];
    // translatable attributes
    var els = root.querySelectorAll('[title],[placeholder],[aria-label]');
    for (var e2 = 0; e2 < els.length; e2++) {
      ['title', 'placeholder', 'aria-label'].forEach(function (a) {
        var v = els[e2].getAttribute(a); if (!v) return; var t = trPhrase(v);
        if (t != null && t !== v) els[e2].setAttribute(a, t);
      });
    }
  }

  // Debounced re-apply on any DOM change, so navigation re-renders stay localized.
  var _pending = 0, _observing = false;
  function scheduleApply() {
    if (pickLang() === 'en') return;
    if (_pending) clearTimeout(_pending);
    _pending = setTimeout(function () {
      _pending = 0; try { _mo && _mo.disconnect(); } catch (_) {}
      try { applyTo(document.body); } catch (_) {}
      try { if (_observing && _mo) _mo.observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (_) {}
    }, 40);
  }
  var _mo = (typeof MutationObserver !== 'undefined') ? new MutationObserver(function () { scheduleApply(); }) : null;
  function startObserving() {
    if (!_mo || _observing) return; _observing = true;
    try { _mo.observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (_) {}
  }

  function setLang(code) {
    try { localStorage.setItem('cyberrx_lang', code); } catch (_) {}
    try { document.documentElement.setAttribute('lang', code); } catch (_) {}
    // Re-render from source English, then the observer/apply localizes the fresh DOM.
    try { if (typeof render === 'function' && typeof CUR !== 'undefined') render(CUR); } catch (_) {}
    if (code === 'en') { try { location.reload(); } catch (_) {} return; }  // cleanest full revert to English
    startObserving(); scheduleApply(); paint();
  }
  function paint() {
    var el = document.getElementById('nlangbar'); if (!el) return; var cur = lang();
    el.innerHTML = LANGS.map(function (l) {
      var on = l[0] === cur;
      return '<button data-nlang="' + l[0] + '" style="border:none;background:' + (on ? '#1A5FA0' : 'transparent') + ';color:' + (on ? '#fff' : '#5F5E5A') + ';font-family:inherit;font-weight:600;font-size:11px;line-height:1;border-radius:99px;padding:5px 10px;cursor:pointer">' + l[1] + '</button>';
    }).join('');
  }
  function mount() {
    if (document.getElementById('nlangbar')) return;
    var bar = document.createElement('div'); bar.id = 'nlangbar';
    bar.style.cssText = 'position:fixed;top:10px;right:12px;z-index:9000;display:flex;gap:2px;background:rgba(255,255,255,.92);backdrop-filter:blur(6px);border:1px solid #E6E4DE;border-radius:99px;padding:3px;box-shadow:0 4px 14px rgba(0,0,0,.08)';
    document.body.appendChild(bar); paint();
    // If a non-English language is already set (persisted), start localizing immediately.
    if (pickLang() !== 'en') { startObserving(); scheduleApply(); }
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-nlang]'); if (b) setLang(b.getAttribute('data-nlang')); });
  if (document.readyState !== 'loading') mount(); else document.addEventListener('DOMContentLoaded', mount);

  // Expose.
  window.nt = nt; window.nerionLang = lang; window.nerionSetLang = setLang;
  window.nerionI18nApply = function () { scheduleApply(); };
  window.__NERION_DICT = DICT;   // so an extraction pass can see current coverage
})();
