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
  var LANGS = [['en', 'EN'], ['fr', 'FR'], ['zh', 'ZH'], ['ja', 'JA']];
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
    'os.peers.contribute': { en: 'Contribute our anonymized outcomes', fr: 'Contribuer nos résultats anonymisés', zh: '贡献我们的匿名结果', ja: '当社の匿名化結果を提供' },
    // Composite assessment sentences — built from these templates via nt() so the WHOLE sentence
    // is translated as a unit (the runtime DOM translator can only reach single text nodes, which
    // left number-interleaved sentences half-English). {placeholders} carry the dynamic bits; any
    // <b> markup and function-label text inside still localizes via the DICT pass.
    'ca.dek.clean':  { en: 'No control is failing outright — {na} await a sensor or fresh attestation to prove', fr: 'Aucun contrôle n’est en échec avéré — {na} attendent un capteur ou une attestation à jour pour être prouvés', zh: '没有控制措施彻底失效——{na} 项仍需传感器或最新证明来加以佐证', ja: '完全に失敗している管理策はありません——{na} 件はセンサーまたは最新の証明による裏付けを待っています' },
    'ca.dek.def1':   { en: '{nm} control is not met and {na} still await evidence', fr: '{nm} contrôle n’est pas satisfait et {na} attendent encore des preuves', zh: '{nm} 项控制措施未达标，另有 {na} 项仍待举证', ja: '{nm} 件の管理策が未達で、{na} 件は依然として証拠待ちです' },
    'ca.dek.defN':   { en: '{nm} controls are not met and {na} still await evidence', fr: '{nm} contrôles ne sont pas satisfaits et {na} attendent encore des preuves', zh: '{nm} 项控制措施未达标，另有 {na} 项仍待举证', ja: '{nm} 件の管理策が未達で、{na} 件は依然として証拠待ちです' },
    'ca.dek.weak':   { en: ', with {lbl} the weakest function at {s}.', fr: ', {lbl} étant la fonction la plus faible à {s}.', zh: '，其中 {lbl} 为最薄弱的职能，得分 {s}。', ja: '、最も弱い機能は {lbl} で {s} です。' },
    'ca.dek.tail':   { en: 'Below: what the score is built on, whether you can prove it, and the moves that raise it.', fr: 'Ci-dessous : ce sur quoi repose le score, si vous pouvez le prouver, et les actions qui le font progresser.', zh: '下方展示：评分的构成依据、能否加以证明，以及提升评分的举措。', ja: '以下に、スコアの根拠、それを証明できるか、そしてスコアを高める施策を示します。' },
    'ca.prove.conf': { en: ' or human-confirmed', fr: ' ou confirmés par un humain', zh: '或经人工确认', ja: 'または人間による確認' },
    'ca.prove.line': { en: '{def} of your {total} controls are defensible today — observed by a live sensor{conf}, the number you can put in front of a board, an auditor or a regulator right now. Another {pend} is telemetry-backed and one click from confirmed (see the Confirm queue); the rest sit on a current attestation or await a connector to light up.', fr: '{def} de vos {total} contrôles sont défendables aujourd’hui — observés par un capteur en direct{conf}, le chiffre que vous pouvez présenter à un conseil, un auditeur ou un régulateur dès maintenant. {pend} de plus sont adossés à la télémétrie et à un clic de la confirmation (voir la file de confirmation) ; le reste repose sur une attestation à jour ou attend qu’un connecteur les active.', zh: '在您的 {total} 项控制措施中，{def} 今日即可举证——由实时传感器观测{conf}，是您现在就能向董事会、审计师或监管机构出示的数字。另有 {pend} 有遥测支撑、一键即可确认（见确认队列）；其余则依托当前有效的证明，或等待连接器接入以激活。', ja: '{total} 件の管理策のうち、{def} は本日時点で立証可能です——ライブセンサーによる観測{conf}で、取締役会・監査人・規制当局に今すぐ示せる数字です。さらに {pend} はテレメトリに裏付けられ、確認まであと一クリックです（確認キューを参照）。残りは現行の証明に依拠するか、コネクター接続による有効化を待っています。' },
    'ca.basis.tag':  { en: 'Scope', fr: 'Portée', zh: '范围', ja: '範囲' },
    'ca.basis.ent':  { en: '<b>Enterprise</b> is the equal-weighted average of your {n} regions — a consolidated roll-up, not any one region.', fr: '<b>Enterprise</b> est la moyenne équipondérée de vos {n} régions — un cumul consolidé, non une région en particulier.', zh: '<b>Enterprise</b> 是您 {n} 个地区的等权平均——一个合并汇总，而非任何单一地区。', ja: '<b>Enterprise</b> は {n} 地域の等加重平均です——特定の地域ではなく、統合的な集計です。' },
    'ca.basis.region': { en: '<b>{label}</b> is the equal-weighted average of its {n} entities — itself one of {nr} regions rolling up to <b>Enterprise</b>.', fr: '<b>{label}</b> est la moyenne équipondérée de ses {n} entités — elle-même l’une des {nr} régions remontant vers <b>Enterprise</b>.', zh: '<b>{label}</b> 是其 {n} 个实体的等权平均——本身是汇总至 <b>Enterprise</b> 的 {nr} 个地区之一。', ja: '<b>{label}</b> はその {n} 個のエンティティの等加重平均であり——<b>Enterprise</b> に集約される {nr} 地域の一つです。' },
    'ca.basis.entity': { en: 'This is a single <b>entity</b>, scored directly from its own telemetry &amp; evidence{more}.', fr: 'Il s’agit d’une seule <b>entité</b>, évaluée directement à partir de sa propre télémétrie et de ses preuves{more}.', zh: '这是单个<b>实体</b>，直接依据其自身的遥测与证据进行评分{more}。', ja: 'これは単一の<b>エンティティ</b>であり、自身のテレメトリと証拠から直接採点されます{more}。' },
    'ca.basis.entity.more': { en: ' — one of {n} in <b>{label}</b>', fr: ' — l’une des {n} dans <b>{label}</b>', zh: '——{label} 中的 {n} 个之一', ja: '——{label} 内の {n} 件のうちの一つ' },
    'ca.sub.summary':  { en: 'Summary', fr: 'Résumé', zh: '摘要', ja: '概要' },
    'ca.sub.controls': { en: 'Controls', fr: 'Contrôles', zh: '控制措施', ja: '管理策' },
    'ca.sub.all':      { en: 'All controls ›', fr: 'Tous les contrôles ›', zh: '全部控制措施 ›', ja: 'すべての管理策 ›' },
    'ca.sub.back':     { en: '‹ Back to summary', fr: '‹ Retour au résumé', zh: '‹ 返回摘要', ja: '‹ 概要に戻る' },
    'ca.dek.notmetlabel': { en: 'not met', fr: 'non satisfaits', zh: '未达标', ja: '未達' },
    'ca.dek.awaitlabel':  { en: 'awaiting evidence', fr: 'en attente de preuves', zh: '待举证', ja: '証拠待ち' },
    // ── Decisions dashboard (board-grade) ──
    'fn.GV': { en: 'Govern', fr: 'Gouverner', zh: '治理', ja: 'ガバナンス' },
    'fn.ID': { en: 'Identify', fr: 'Identifier', zh: '识别', ja: '識別' },
    'fn.PR': { en: 'Protect', fr: 'Protéger', zh: '保护', ja: '防御' },
    'fn.DE': { en: 'Detect', fr: 'Détecter', zh: '检测', ja: '検知' },
    'fn.RS': { en: 'Respond', fr: 'Répondre', zh: '响应', ja: '対応' },
    'fn.RC': { en: 'Recover', fr: 'Récupérer', zh: '恢复', ja: '復旧' },
    'dec.rr.High': { en: 'High', fr: 'Élevée', zh: '高', ja: '高' },
    'dec.rr.Medium': { en: 'Medium', fr: 'Moyenne', zh: '中', ja: '中' },
    'dec.rr.Modest': { en: 'Modest', fr: 'Modérée', zh: '较低', ja: '低' },
    'dec.dir.holding': { en: 'holding', fr: 'stable', zh: '维持', ja: '横ばい' },
    'dec.dir.improving': { en: 'improving', fr: 'en progression', zh: '改善中', ja: '改善傾向' },
    'dec.dir.slipping': { en: 'slipping', fr: 'en recul', zh: '下滑中', ja: '低下傾向' },
    'dec.need.edr': { en: 'Push agents to the remaining uncovered endpoints and turn on automated containment.', fr: 'Déployer les agents sur les terminaux non encore couverts et activer le confinement automatisé.', zh: '将代理程序部署至尚未覆盖的终端，并启用自动化遏制。', ja: '未カバーの残るエンドポイントにエージェントを展開し、自動封じ込めを有効化する。' },
    'dec.need.mfa': { en: 'Enforce MFA on legacy, service and VPN accounts.', fr: 'Imposer l’authentification multifacteur sur les comptes hérités, de service et VPN.', zh: '对遗留账户、服务账户和 VPN 账户强制实施多因素认证。', ja: 'レガシー、サービス、VPN の各アカウントに多要素認証を強制する。' },
    'dec.need.pam': { en: 'Vault the remaining privileged accounts and switch to just-in-time access.', fr: 'Placer sous coffre-fort les comptes à privilèges restants et basculer vers l’accès juste-à-temps.', zh: '将剩余的特权账户纳入密码保管库，并切换为即时访问模式。', ja: '残る特権アカウントをボールト化し、ジャストインタイムアクセスに切り替える。' },
    'dec.need.vuln': { en: 'Shorten the critical-vuln remediation SLA on internet-facing assets.', fr: 'Raccourcir le SLA de remédiation des vulnérabilités critiques sur les actifs exposés à Internet.', zh: '缩短面向互联网资产的关键漏洞修复 SLA。', ja: 'インターネットに面した資産における重大脆弱性の修復 SLA を短縮する。' },
    'dec.need.aware': { en: 'Run targeted simulations for the highest-click departments.', fr: 'Mener des simulations ciblées pour les départements aux taux de clic les plus élevés.', zh: '针对点击率最高的部门开展定向模拟演练。', ja: 'クリック率が最も高い部門を対象とした標的型シミュレーションを実施する。' },
    'dec.need.siem': { en: 'Expand log coverage and tune correlation rules to cut MTTD.', fr: 'Élargir la couverture des journaux et affiner les règles de corrélation pour réduire le MTTD.', zh: '扩大日志覆盖范围并优化关联规则，以缩短 MTTD。', ja: 'ログの網羅範囲を拡大し、相関ルールを調整して MTTD を短縮する。' },
    'dec.need.dlp': { en: 'Deploy DLP across email, web and endpoint egress channels.', fr: 'Déployer la DLP sur les canaux de sortie de messagerie, web et terminaux.', zh: '在电子邮件、Web 及终端外发通道部署数据防泄露（DLP）。', ja: 'メール、Web、エンドポイントの各流出経路に DLP を展開する。' },
    'dec.need.seg': { en: 'Segment crown-jewel systems and enforce east-west controls.', fr: 'Segmenter les systèmes abritant les actifs critiques et imposer des contrôles est-ouest.', zh: '对核心资产系统进行网络分段，并强制实施东西向流量管控。', ja: '重要資産システムをセグメント化し、東西方向の制御を強制する。' },
    'dec.need.backup': { en: 'Verify immutable backups and test restore for every crown jewel.', fr: 'Vérifier les sauvegardes immuables et tester la restauration de chaque actif critique.', zh: '验证不可变备份，并对每项核心资产测试恢复流程。', ja: '各重要資産についてイミュータブルバックアップを検証し、復元テストを実施する。' },
    'dec.need.cspm': { en: 'Baseline cloud misconfigurations and remediate public exposure.', fr: 'Établir un référentiel des erreurs de configuration cloud et remédier aux expositions publiques.', zh: '建立云端配置错误基线，并修复公开暴露风险。', ja: 'クラウドの設定ミスをベースライン化し、公開露出を修復する。' },
    'dec.need.sspm': { en: 'Baseline SaaS misconfigurations and over-privileged access across your business apps.', fr: 'Établir un référentiel des erreurs de configuration SaaS et des accès sur-privilégiés dans vos applications métier.', zh: '在各业务应用中建立 SaaS 配置错误与过度授权访问的基线。', ja: '業務アプリ全体にわたる SaaS の設定ミスと過剰権限アクセスをベースライン化する。' },
    'dec.kick': { en: 'Decisions · {scope} · what needs your sign-off?', fr: 'Décisions · {scope} · qu’est-ce qui requiert votre validation ?', zh: '决策 · {scope} · 哪些事项需要您的批准？', ja: '意思決定 · {scope} · 承認が必要な事項は？' },
    'dec.verdict': { en: '{n} funding decisions waiting for {scope} — ordered so {scope}’s weakest function is addressed first, each tied to the function it lifts and the crown jewels it protects. Commit or defer.', fr: '{n} décisions de financement en attente pour {scope} — classées de sorte que la fonction la plus faible de {scope} soit traitée en premier, chacune rattachée à la fonction qu’elle renforce et aux actifs critiques qu’elle protège. Engager ou reporter.', zh: '{n} 项资金决策正等待 {scope} 处理 — 已排序以优先解决 {scope} 最薄弱的职能，每项均关联其所提升的职能及其所保护的核心资产。请批准或延期。', ja: '{scope} の承認を待つ資金拠出の意思決定が {n} 件 — {scope} の最も弱い機能から優先的に対処するよう並べ、各項目は強化する機能と保護する重要資産に紐づいています。承認するか保留してください。' },
    'dec.verdict.empty': { en: 'Connect your tools and the funded decisions that move your posture appear here.', fr: 'Connectez vos outils et les décisions financées qui font évoluer votre posture apparaîtront ici.', zh: '连接您的工具后，能够改善安全态势的已获资助决策将显示于此。', ja: 'ツールを接続すると、態勢を前進させる資金拠出済みの意思決定がここに表示されます。' },
    'dec.intro': { en: 'The board-context band is the factual thresholds a cyber loss is judged against — risk appetite, the SEC disclosure line, insurance and your crown jewels (Nerion reports no made-up loss dollar). Each decision below is one investment case for {scope} — the maturity it moves, the risk it reduces, and the tradeoff. Choosing one stamps it with your name and time, keeps it editable for 24 hours, and opens a tracked project. Switch scope in the cards above to see another region or entity.', fr: 'Le bandeau de contexte du conseil regroupe les seuils factuels au regard desquels une perte cyber est évaluée — appétence au risque, seuil de divulgation SEC, assurance et vos actifs critiques (Nerion ne rapporte aucun montant de perte fictif). Chaque décision ci-dessous constitue un dossier d’investissement pour {scope} — la maturité qu’elle fait évoluer, le risque qu’elle réduit et l’arbitrage. En choisir une l’estampille de votre nom et de l’horodatage, la maintient modifiable pendant 24 heures et ouvre un projet suivi. Changez de périmètre dans les cartes ci-dessus pour voir une autre région ou entité.', zh: '董事会背景条带列示了衡量网络损失所依据的事实性阈值 — 风险偏好、SEC 披露门槛、保险以及您的核心资产（Nerion 不报告任何虚构的损失金额）。以下每项决策都是针对 {scope} 的一份投资论证 — 它所提升的成熟度、所降低的风险及相应的取舍。选定某项后将以您的姓名和时间加以标记，24 小时内可编辑，并开启一个受跟踪的项目。在上方卡片中切换范围可查看其他区域或实体。', ja: '取締役会コンテキスト帯は、サイバー損失を判定する際の事実に基づく基準値をまとめたものです — リスク選好、SEC の開示ライン、保険、そして重要資産（Nerion は架空の損失額を一切報告しません）。以下の各意思決定は {scope} に対する一つの投資判断であり、動かす成熟度、低減するリスク、そしてトレードオフを示します。いずれかを選ぶと、あなたの氏名と時刻が刻印され、24 時間は編集可能なまま、追跡対象のプロジェクトが開かれます。上部のカードでスコープを切り替えると、別の地域や事業体を表示できます。' },
    'dec.band.eyebrow': { en: 'Board context · enterprise · what a cyber loss is measured against', fr: 'Contexte du conseil · entreprise · ce à quoi une perte cyber est mesurée', zh: '董事会背景 · 企业 · 网络损失的衡量基准', ja: '取締役会コンテキスト · 企業 · サイバー損失を測る基準' },
    'dec.band.appetite.l': { en: 'Board risk appetite', fr: 'Appétence au risque du conseil', zh: '董事会风险偏好', ja: '取締役会のリスク選好' },
    'dec.band.appetite.s': { en: 'the ceiling the board has set', fr: 'le plafond fixé par le conseil', zh: '董事会设定的上限', ja: '取締役会が設定した上限' },
    'dec.band.matr.l': { en: 'Disclosure materiality', fr: 'Seuil de matérialité de divulgation', zh: '披露重要性', ja: '開示重要性' },
    'dec.band.matr.s': { en: 'SEC Item 106 — a loss above this is reportable', fr: 'SEC Item 106 — une perte supérieure est déclarable', zh: 'SEC Item 106 — 超过此额度的损失须予披露', ja: 'SEC Item 106 — これを超える損失は報告義務の対象' },
    'dec.band.ins.l': { en: 'Cyber insurance limit', fr: 'Plafond d’assurance cyber', zh: '网络保险赔付上限', ja: 'サイバー保険の補償上限' },
    'dec.band.ins.s': { en: 'retention {r}', fr: 'franchise {r}', zh: '自留额 {r}', ja: '自己負担額 {r}' },
    'dec.band.ins.s0': { en: 'the transfer layer', fr: 'la couche de transfert', zh: '风险转移层', ja: 'リスク移転レイヤー' },
    'dec.band.cj.l': { en: 'Crown jewels in scope', fr: 'Actifs critiques dans le périmètre', zh: '范围内的核心资产', ja: 'スコープ内の重要資産' },
    'dec.band.cj.s.crit': { en: '{n} rated critical · maturity {dir}', fr: '{n} classés critiques · maturité {dir}', zh: '{n} 项评为关键 · 成熟度{dir}', ja: '{n} 件が重大と評価 · 成熟度{dir}' },
    'dec.band.cj.s.plain': { en: 'the assets that matter · maturity {dir}', fr: 'les actifs qui comptent · maturité {dir}', zh: '关键资产 · 成熟度{dir}', ja: '重要な資産 · 成熟度{dir}' },
    'dec.board.tag': { en: 'Board relevant', fr: 'Pertinent pour le conseil', zh: '与董事会相关', ja: '取締役会に関連' },
    'dec.eyebrow': { en: 'Decisions · {scope} · as of {date}', fr: 'Décisions · {scope} · au {date}', zh: '决策 · {scope} · 截至 {date}', ja: '意思決定 · {scope} · {date} 時点' },
    'dec.strip.title': { en: 'Where the next dollar works hardest · biggest posture lift first', fr: 'Là où le prochain euro est le plus rentable · le plus fort gain de posture en premier', zh: '下一笔投入回报最大之处 · 优先呈现态势提升最显著者', ja: '次の一ドルが最も効く領域 · 態勢向上が最大のものから' },
    'dec.strip.foot': { en: 'Ranked by the control-maturity these decisions add. Implementation cost is scoped with your team — Nerion does not invent a cost, and the gain is proven against telemetry once funded.', fr: 'Classées selon la maturité des contrôles que ces décisions apportent. Le coût de mise en œuvre est cadré avec votre équipe — Nerion n’invente aucun coût, et le gain est prouvé au regard de la télémétrie une fois le financement accordé.', zh: '按这些决策所增加的控制成熟度排序。实施成本由您的团队共同界定 — Nerion 不会杜撰成本，且获资助后其成效将依据遥测数据加以验证。', ja: 'これらの意思決定がもたらす統制成熟度で順位付けしています。実装コストはお客様のチームと範囲を定めます — Nerion がコストを捏造することはなく、資金拠出後は成果をテレメトリに照らして実証します。' },
    'dec.strip.row': { en: '{fn} {from}→3.5', fr: '{fn} {from}→3.5', zh: '{fn} {from}→3.5', ja: '{fn} {from}→3.5' },
    'dec.strip.rowc': { en: '{n} controls', fr: '{n} contrôles', zh: '{n} 项控制', ja: '{n} 件の統制' },
    'dec.finding': { en: 'At {scope}, {fn} sits at {score}/5{clause}. ', fr: 'Pour {scope}, {fn} se situe à {score}/5{clause}. ', zh: '在 {scope}，{fn} 处于 {score}/5{clause}。 ', ja: '{scope} では、{fn} は {score}/5{clause}にあります。 ' },
    'dec.finding.below': { en: ' — below the 3.5 target', fr: ' — en deçà de la cible de 3,5', zh: ' — 低于 3.5 的目标', ja: ' — 目標の 3.5 を下回る' },
    'dec.finding.weak': { en: ' — the weakest function here', fr: ' — la fonction la plus faible ici', zh: ' — 此处最薄弱的职能', ja: ' — ここで最も弱い機能' },
    'dec.metric.lift': { en: 'Lifts {fn} {score}/5 → target 3.5', fr: 'Renforce {fn} {score}/5 → cible 3,5', zh: '将 {fn} 从 {score}/5 提升 → 目标 3.5', ja: '{fn} を {score}/5 → 目標 3.5 へ引き上げ' },
    'dec.metric.controls': { en: '{n} controls mapped', fr: '{n} contrôles cartographiés', zh: '已映射 {n} 项控制', ja: '{n} 件の統制をマッピング' },
    'dec.metric.control1': { en: '{n} control mapped', fr: '{n} contrôle cartographié', zh: '已映射 {n} 项控制', ja: '{n} 件の統制をマッピング' },
    'dec.metric.risk': { en: 'Risk reduction {level}', fr: 'Réduction du risque {level}', zh: '风险降低 {level}', ja: 'リスク低減 {level}' },
    'dec.metric.supports': { en: 'Supports {regime}', fr: 'Soutient {regime}', zh: '支持 {regime}', ja: '{regime} を支援' },
    'dec.board.weak': { en: 'Addresses {scope}’s weakest function. ', fr: 'Traite la fonction la plus faible de {scope}. ', zh: '解决 {scope} 最薄弱的职能。 ', ja: '{scope} の最も弱い機能に対処します。 ' },
    'dec.board.cj.crit': { en: 'Hardens your crown-jewel estate ({n} critical). ', fr: 'Renforce votre parc d’actifs critiques ({n} critiques). ', zh: '强化您的核心资产群（{n} 项关键）。 ', ja: '重要資産群を堅牢化します（{n} 件が重大）。 ' },
    'dec.board.cj.plain': { en: 'Hardens your crown-jewel estate. ', fr: 'Renforce votre parc d’actifs critiques. ', zh: '强化您的核心资产群。 ', ja: '重要資産群を堅牢化します。 ' },
    'dec.board.matr': { en: 'A lapse here is the kind of event that can cross the {v} disclosure line.', fr: 'Une défaillance ici est le type d’événement susceptible de franchir le seuil de divulgation de {v}.', zh: '此处的疏漏正是可能跨越 {v} 披露门槛的那类事件。', ja: 'ここでの不備は、{v} の開示ラインを超えかねない類いの事象です。' },
    'dec.board.default': { en: 'The largest single posture improvement on the table.', fr: 'La plus importante amélioration de posture à l’étude.', zh: '当前方案中态势改善幅度最大的一项。', ja: '検討対象のうち、単独で最大の態勢改善です。' },
    'dec.rec.osum': { en: 'Lifts {fn} · improves {n} mapped controls toward target maturity', fr: 'Renforce {fn} · fait progresser {n} contrôles cartographiés vers la maturité cible', zh: '提升 {fn} · 使 {n} 项已映射控制向目标成熟度迈进', ja: '{fn} を引き上げ · マッピング済みの {n} 件の統制を目標成熟度へ前進' },
    'dec.rec.osum.g': { en: 'Lifts {fn} · improves your posture in this area', fr: 'Renforce {fn} · améliore votre posture dans ce domaine', zh: '提升 {fn} · 改善您在该领域的安全态势', ja: '{fn} を引き上げ · この領域の態勢を改善' },
    'dec.pro.lift': { en: 'Lifts {fn} ({score}/5){suffix}.', fr: 'Renforce {fn} ({score}/5){suffix}.', zh: '提升 {fn}（{score}/5）{suffix}。', ja: '{fn}（{score}/5）を引き上げます{suffix}。' },
    'dec.pro.suffix.weak': { en: ' — {scope}’s weakest function', fr: ' — la fonction la plus faible de {scope}', zh: ' — {scope} 最薄弱的职能', ja: ' — {scope} の最も弱い機能' },
    'dec.pro.suffix.below': { en: ', below the 3.5 target', fr: ', en deçà de la cible de 3,5', zh: '，低于 3.5 的目标', ja: '、目標の 3.5 を下回る' },
    'dec.pro.cj': { en: 'Strengthens protection of your crown-jewel estate.', fr: 'Renforce la protection de votre parc d’actifs critiques.', zh: '强化对您核心资产群的保护。', ja: '重要資産群の保護を強化します。' },
    'dec.pro.moves': { en: 'Improves {n} mapped controls toward target maturity at {scope}.', fr: 'Fait progresser {n} contrôles cartographiés vers la maturité cible au sein de {scope}.', zh: '推动 {scope} 的 {n} 项已映射控制向目标成熟度迈进。', ja: '{scope} におけるマッピング済みの {n} 件の統制を目標成熟度へ前進させます。' },
    'dec.pro.track': { en: 'Opens a tracked project with a measured before/after — the gain is proven against telemetry, not asserted.', fr: 'Ouvre un projet suivi avec une mesure avant/après — le gain est prouvé au regard de la télémétrie, non affirmé.', zh: '开启一个受跟踪的项目并进行前后测量 — 成效依据遥测数据加以验证，而非空口断言。', ja: '前後を計測する追跡対象プロジェクトを開きます — 成果は主張ではなくテレメトリに照らして実証されます。' },
    'dec.con.capital': { en: 'Requires capital this cycle — cost is scoped with your team (Nerion does not invent it).', fr: 'Nécessite un investissement sur ce cycle — le coût est cadré avec votre équipe (Nerion ne l’invente pas).', zh: '本周期需投入资金 — 成本由您的团队共同界定（Nerion 不会杜撰）。', ja: '今サイクルでの資本投下が必要です — コストはお客様のチームと範囲を定めます（Nerion が捏造することはありません）。' },
    'dec.consequence': { en: 'Opens a tracked funding project and begins control-improvement tracking; the maturity gain is verified against telemetry as it lands.', fr: 'Ouvre un projet de financement suivi et lance le suivi de l’amélioration des contrôles ; le gain de maturité est vérifié au regard de la télémétrie à mesure qu’il se concrétise.', zh: '开启一个受跟踪的资助项目并启动控制改进跟踪；成熟度提升将在其落地过程中依据遥测数据加以验证。', ja: '追跡対象の資金拠出プロジェクトを開き、統制改善の追跡を開始します。成熟度の向上は、実現に伴いテレメトリに照らして検証されます。' },
    'dec.alt.osum': { en: 'Records the deferral; the gap stays open', fr: 'Enregistre le report ; l’écart reste ouvert', zh: '记录此次延期；缺口仍未闭合', ja: '保留を記録します。ギャップは未解消のままです' },
    'dec.alt.con.gap': { en: 'The coverage gap stays open until it is funded{weak}.', fr: 'L’écart de couverture reste ouvert jusqu’à son financement{weak}.', zh: '在获得资助前，覆盖缺口将始终存在{weak}。', ja: '資金が拠出されるまで、カバレッジのギャップは未解消のままです{weak}。' },
    'dec.alt.con.gap.weak': { en: ' — and it is this scope’s weakest function', fr: ' — et c’est la fonction la plus faible de ce périmètre', zh: ' — 且这是该范围内最薄弱的职能', ja: ' — しかもこれはこのスコープで最も弱い機能です' },
    'dec.alt.con.remains': { en: 'The gap remains until the next cycle.', fr: 'L’écart subsiste jusqu’au prochain cycle.', zh: '缺口将持续至下一周期。', ja: 'ギャップは次のサイクルまで残ります。' },
    'dec.alt.pro.nospend': { en: 'No spend now.', fr: 'Aucune dépense pour l’instant.', zh: '当前无需支出。', ja: '今は支出なし。' },
    'dec.alt.consequence': { en: 'Records the decision as deferred with your rationale; the gap remains until it is funded.', fr: 'Enregistre la décision comme reportée avec votre justification ; l’écart subsiste jusqu’à son financement.', zh: '将该决策连同您的理由记录为延期；在获得资助前缺口将始终存在。', ja: 'この意思決定を、あなたの根拠とともに保留として記録します。資金が拠出されるまでギャップは残ります。' },
    'dec.meta.ev': { en: 'Measured · continuous control assessment', fr: 'Mesuré · évaluation continue des contrôles', zh: '实测 · 持续控制评估', ja: '実測 · 継続的な統制評価' },
    'dec.meta.basis': { en: 'Ranked by {scope}’s weakest function; implementation cost is scoped with your team. Nerion verifies the maturity gain against telemetry once the project is funded.', fr: 'Classé selon la fonction la plus faible de {scope} ; le coût de mise en œuvre est cadré avec votre équipe. Nerion vérifie le gain de maturité au regard de la télémétrie une fois le projet financé.', zh: '按 {scope} 最薄弱的职能排序；实施成本由您的团队共同界定。项目获资助后，Nerion 将依据遥测数据验证成熟度提升。', ja: '{scope} の最も弱い機能で順位付けしています。実装コストはお客様のチームと範囲を定めます。プロジェクトへの資金拠出後、Nerion は成熟度の向上をテレメトリに照らして検証します。' },
    'dec.foot': { en: 'Nerion reports no modeled loss dollar — decisions are framed against your board’s factual thresholds (appetite, SEC materiality, insurance) and the maturity each one moves. Implementation cost is scoped with your team, and every choice is logged with who, when and why for the board record.', fr: 'Nerion ne rapporte aucun montant de perte modélisé — les décisions sont cadrées au regard des seuils factuels de votre conseil (appétence, matérialité SEC, assurance) et de la maturité que chacune fait évoluer. Le coût de mise en œuvre est cadré avec votre équipe, et chaque choix est consigné avec le qui, le quand et le pourquoi pour le registre du conseil.', zh: 'Nerion 不报告任何建模损失金额 — 决策均以贵董事会的事实性阈值（风险偏好、SEC 重要性、保险）及各项决策所提升的成熟度为框架。实施成本由您的团队共同界定，且每一项选择均记录其经办人、时间与理由，以备董事会存档。', ja: 'Nerion はモデル化した損失額を一切報告しません — 意思決定は、取締役会の事実に基づく基準値（選好、SEC 重要性、保険）と、各項目が動かす成熟度に照らして枠組み化されます。実装コストはお客様のチームと範囲を定め、すべての選択は、取締役会の記録用に担当者・日時・理由とともにログ化されます。' },
    'dec.metastrip.rec': { en: 'Recommended', fr: 'Recommandé', zh: '推荐', ja: '推奨' },
    'dec.metastrip.ev': { en: 'Evidence confidence', fr: 'Niveau de confiance des preuves', zh: '证据置信度', ja: '証拠の信頼度' },
    'dec.metastrip.req': { en: 'Requested by {who}', fr: 'Demandé par {who}', zh: '由 {who} 提出', ja: '{who} が要求' },
    'dec.metastrip.decision': { en: 'Decision {n} ·', fr: 'Décision {n} ·', zh: '决策 {n} ·', ja: '意思決定 {n} ·' },
    'dec.q': { en: 'Fund {name}?', fr: 'Financer {name} ?', zh: '为 {name} 提供资金？', ja: '{name} に資金を拠出しますか？' },
    'scope.hdr.ent': { en: 'Enterprise & its regions · {fw} · Enterprise is the equal-weighted average of the regions · weakest first', fr: 'L’entreprise et ses régions · {fw} · L’entreprise correspond à la moyenne pondérée à parts égales des régions · les plus faibles en premier', zh: '企业及其各区域 · {fw} · 企业为各区域的等权平均值 · 最薄弱者优先', ja: '企業とその各地域 · {fw} · 企業は各地域の等加重平均です · 最も脆弱なものから' },
    'scope.hdr.reg': { en: '{region} & its entities · {fw} · {region} is the average of its entities · weakest first', fr: '{region} et ses entités · {fw} · {region} correspond à la moyenne de ses entités · les plus faibles en premier', zh: '{region} 及其各实体 · {fw} · {region} 为各实体的平均值 · 最薄弱者优先', ja: '{region} とその各エンティティ · {fw} · {region} は各エンティティの平均です · 最も脆弱なものから' },
    'fw.foot.cross': { en: 'Crosswalk mapping: {label} controls inherit the maturity of the NIST CSF 2.0 controls they map to (public crosswalk). Where a tool evidences a control directly, that telemetry is used instead. This is a readiness indicator — your certification body issues the audit opinion.', fr: 'Correspondance (crosswalk) : les contrôles {label} héritent de la maturité des contrôles NIST CSF 2.0 auxquels ils correspondent (crosswalk public). Lorsqu’un outil atteste directement d’un contrôle, c’est cette télémétrie qui est utilisée. Il s’agit d’un indicateur de préparation — c’est votre organisme de certification qui émet l’opinion d’audit.', zh: '交叉映射：{label} 控制项继承其所映射到的 NIST CSF 2.0 控制项的成熟度（公开交叉映射）。当某工具直接为某控制项提供证据时，则改用该遥测数据。这是一项就绪度指标——审计意见由您的认证机构出具。', ja: 'クロスウォークマッピング：{label} の制御項目は、対応する NIST CSF 2.0 の制御項目の成熟度を継承します（公開クロスウォーク）。ツールが制御項目を直接立証する場合は、そのテレメトリが代わりに使用されます。これは準備状況の指標であり、監査意見は認証機関が発行します。' },
    'scope.enterprise': { en: 'Enterprise', fr: 'Entreprise', zh: '企业整体', ja: '全社' },
    'deck.lvl.0': { en: 'Non-existent', fr: 'Inexistant', zh: '不存在', ja: '存在しない' },
    'deck.lvl.1': { en: 'Initial', fr: 'Initial', zh: '初始级', ja: '初期' },
    'deck.lvl.2': { en: 'Repeatable', fr: 'Reproductible', zh: '可重复级', ja: '反復可能' },
    'deck.lvl.3': { en: 'Defined', fr: 'Défini', zh: '已定义级', ja: '定義済み' },
    'deck.lvl.4': { en: 'Managed', fr: 'Géré', zh: '已管理级', ja: '管理された' },
    'deck.lvl.5': { en: 'Optimizing', fr: 'En optimisation', zh: '优化级', ja: '最適化中' },
    'deck.cover.sub': { en: '{fw} Security Maturity Assessment', fr: 'Évaluation de la maturité de sécurité {fw}', zh: '{fw} 安全成熟度评估', ja: '{fw} セキュリティ成熟度評価' },
    'deck.cover.preparedby': { en: 'Prepared by Nerion', fr: 'Préparé par Nerion', zh: '由 Nerion 编制', ja: 'Nerion 作成' },
    'deck.cover.reportdate': { en: 'Report date', fr: 'Date du rapport', zh: '报告日期', ja: '報告日' },
    'deck.cover.period': { en: 'Assessment period', fr: 'Période d’évaluation', zh: '评估期间', ja: '評価期間' },
    'deck.cover.scope': { en: 'Scope', fr: 'Périmètre', zh: '评估范围', ja: '評価範囲' },
    'deck.scope.title': { en: 'Scope & limitations', fr: 'Périmètre et limites', zh: '范围与限制', ja: '範囲と制約' },
    'deck.scope.body': { en: 'This assessment reflects conditions observed during the assessment period. It is not an audit, a certification, or an attestation, and confers no opinion under any professional attestation standard. Findings are based on system-collected evidence, documentation provided by {client}, and interviews conducted during the period. This report is prepared solely for the management of {client} and may not be relied upon by any third party.', fr: 'Cette évaluation reflète les conditions observées durant la période d’évaluation. Elle ne constitue ni un audit, ni une certification, ni une attestation, et n’exprime aucune opinion au titre d’une quelconque norme professionnelle d’attestation. Les constats reposent sur des preuves collectées par les systèmes, sur la documentation fournie par {client} et sur les entretiens menés durant la période. Ce rapport est établi à l’usage exclusif de la direction de {client} et ne saurait être invoqué par un tiers.', zh: '本评估反映评估期间所观察到的状况。它并非审计、认证或鉴证，亦不依据任何专业鉴证准则表达意见。各项结论基于系统采集的证据、{client} 提供的文档以及评估期间开展的访谈。本报告仅供 {client} 管理层使用，任何第三方不得依赖。', ja: '本評価は、評価期間中に観察された状況を反映するものです。監査、認証または保証業務のいずれでもなく、いかなる専門的保証基準に基づく意見も表明しません。各所見は、システムが収集した証跡、{client} から提供された文書、および期間中に実施したインタビューに基づきます。本報告書は {client} の経営陣専用に作成されており、いかなる第三者も依拠することはできません。' },
    'deck.scope.dist': { en: 'Distribution & confidentiality: recipients are named by {client} management; onward distribution requires written consent.', fr: 'Diffusion et confidentialité : les destinataires sont désignés par la direction de {client} ; toute rediffusion requiert un consentement écrit.', zh: '分发与保密：接收方由 {client} 管理层指定；任何转发须经书面同意。', ja: '配布と機密保持：受領者は {client} 経営陣が指定します。二次配布には書面による同意を要します。' },
    'deck.exec.title': { en: 'Executive summary', fr: 'Synthèse pour la direction', zh: '执行摘要', ja: 'エグゼクティブサマリー' },
    'deck.exec.verdict.below': { en: 'The {fw} program sits at {level} — {score} of 5, below the 3.5 target', fr: 'Le programme {fw} se situe au niveau {level} — {score} sur 5, en deçà de la cible de 3,5', zh: '{fw} 项目处于 {level} 级——满分 5 分中的 {score} 分，低于 3.5 的目标', ja: '{fw} プログラムは {level}（5 段階中 {score}）であり、目標値 3.5 を下回っています' },
    'deck.exec.verdict.at': { en: 'The {fw} program sits at {level} — {score} of 5, at the 3.5 target', fr: 'Le programme {fw} se situe au niveau {level} — {score} sur 5, au niveau de la cible de 3,5', zh: '{fw} 项目处于 {level} 级——满分 5 分中的 {score} 分，达到 3.5 的目标', ja: '{fw} プログラムは {level}（5 段階中 {score}）であり、目標値 3.5 に達しています' },
    'deck.exec.overall': { en: 'Overall maturity', fr: 'Maturité globale', zh: '整体成熟度', ja: '総合成熟度' },
    'deck.exec.target': { en: 'Target', fr: 'Cible', zh: '目标', ja: '目標' },
    'deck.exec.gap': { en: 'Gap to target', fr: 'Écart à la cible', zh: '与目标的差距', ja: '目標との差' },
    'deck.exec.coverage': { en: 'Coverage', fr: 'Couverture', zh: '覆盖率', ja: 'カバレッジ' },
    'deck.exec.three': { en: 'Three findings that matter', fr: 'Trois constats déterminants', zh: '三项关键发现', ja: '重要な 3 つの所見' },
    'deck.exec.close': { en: 'What it takes to close', fr: 'Ce qu’il faut pour combler l’écart', zh: '弥合差距所需之举', ja: '差を埋めるために必要なこと' },
    'deck.exec.close.body': { en: 'Sequenced remediation across three horizons (0–90 / 90–180 / 180–365 days). Effort and investment shape are the client’s to validate.', fr: 'Remédiation séquencée sur trois horizons (0–90 / 90–180 / 180–365 jours). L’effort et la structure de l’investissement restent à valider par le client.', zh: '按三个时间跨度分阶段实施整改（0–90 / 90–180 / 180–365 天）。工作量与投资结构由客户确认。', ja: '3 つの時間軸（0〜90 / 90〜180 / 180〜365 日）に沿った段階的な是正。工数と投資規模はクライアントによる確認事項です。' },
    'deck.exec.notassessed': { en: 'What we did not assess', fr: 'Ce que nous n’avons pas évalué', zh: '未纳入评估的范围', ja: '評価対象外の事項' },
    'deck.exec.notassessed.body': { en: 'Controls awaiting a connected source are reported as coverage gaps, not failures. Governance and process areas evaluated by attestation are labelled as such.', fr: 'Les contrôles en attente d’une source connectée sont signalés comme des lacunes de couverture, et non comme des défaillances. Les domaines de gouvernance et de processus évalués par attestation sont identifiés comme tels.', zh: '尚未接入数据源的控制项报告为覆盖缺口，而非失效。以书面声明方式评估的治理与流程领域均已如实标注。', ja: '接続元が未整備の統制は、不備ではなくカバレッジ上の欠落として報告します。表明に基づき評価したガバナンスおよびプロセス領域は、その旨を明示しています。' },
    'deck.scorecard.title': { en: 'Function summary scorecard', fr: 'Tableau de synthèse par fonction', zh: '职能汇总记分卡', ja: '機能別サマリースコアカード' },
    'deck.scorecard.sub': { en: 'Current maturity vs. target, by function — weakest first', fr: 'Maturité actuelle vs. cible, par fonction — la plus faible en premier', zh: '各职能当前成熟度与目标对比——最薄弱者优先', ja: '機能別の現状成熟度と目標の比較（弱い順）' },
    'deck.col.function': { en: 'Function', fr: 'Fonction', zh: '职能', ja: '機能' },
    'deck.col.current': { en: 'Current', fr: 'Actuel', zh: '当前', ja: '現状' },
    'deck.col.target': { en: 'Target', fr: 'Cible', zh: '目标', ja: '目標' },
    'deck.col.gap': { en: 'Gap', fr: 'Écart', zh: '差距', ja: '差' },
    'deck.col.priority': { en: 'Priority', fr: 'Priorité', zh: '优先级', ja: '優先度' },
    'deck.current.title': { en: 'Current state — by function', fr: 'État actuel — par fonction', zh: '当前状态——按职能', ja: '現状——機能別' },
    'deck.current.working': { en: 'What is working', fr: 'Ce qui fonctionne', zh: '运作良好之处', ja: '機能している点' },
    'deck.current.gaps': { en: 'Where the gaps concentrate', fr: 'Où se concentrent les lacunes', zh: '差距集中之处', ja: '欠落が集中する領域' },
    'deck.current.matters': { en: 'The one thing that matters most', fr: 'L’élément le plus déterminant', zh: '最为关键的一点', ja: '最も重要な一点' },
    'deck.findings.title': { en: 'Findings — in weighted-priority order', fr: 'Constats — par priorité pondérée', zh: '发现——按加权优先级排序', ja: '所見——加重優先度順' },
    'deck.finding.condition': { en: 'Condition observed', fr: 'Situation observée', zh: '所观察到的状况', ja: '観察された状況' },
    'deck.finding.consequence': { en: 'Business consequence', fr: 'Conséquence pour l’activité', zh: '业务影响', ja: '事業への影響' },
    'deck.finding.recommendation': { en: 'Recommendation', fr: 'Recommandation', zh: '建议', ja: '提言' },
    'deck.finding.affected': { en: 'Affected', fr: 'Éléments concernés', zh: '受影响范围', ja: '影響範囲' },
    'deck.finding.priority': { en: 'Weighted priority', fr: 'Priorité pondérée', zh: '加权优先级', ja: '加重優先度' },
    'deck.cond.tail': { en: 'across the estate; {n} mapped controls are below target.', fr: 'sur l’ensemble du parc ; {n} contrôles cartographiés sont en deçà de la cible.', zh: '覆盖整个资产范围；有 {n} 项已映射控制低于目标。', ja: '（全資産にわたり）。マッピング済みの {n} 件の統制が目標を下回っています。' },
    'deck.roadmap.title': { en: 'Roadmap — sequenced by weighted priority', fr: 'Feuille de route — séquencée par priorité pondérée', zh: '路线图——按加权优先级排序', ja: 'ロードマップ——加重優先度順' },
    'deck.roadmap.h1': { en: '0–90 days', fr: '0–90 jours', zh: '0–90 天', ja: '0〜90 日' },
    'deck.roadmap.h2': { en: '90–180 days', fr: '90–180 jours', zh: '90–180 天', ja: '90〜180 日' },
    'deck.roadmap.h3': { en: '180–365 days', fr: '180–365 jours', zh: '180–365 天', ja: '180〜365 日' },
    'deck.roadmap.note': { en: 'Effort and cost estimates are the client’s to validate.', fr: 'Les estimations d’effort et de coût restent à valider par le client.', zh: '工作量与成本估算由客户确认。', ja: '工数およびコストの見積りはクライアントによる確認事項です。' },
    'deck.board.title': { en: 'Board & audit committee summary', fr: 'Synthèse pour le conseil et le comité d’audit', zh: '董事会与审计委员会摘要', ja: '取締役会・監査委員会向けサマリー' },
    'deck.board.exposure': { en: 'Exposure in business terms', fr: 'Exposition en termes d’activité', zh: '以业务视角衡量的风险敞口', ja: '事業の観点でのリスクエクスポージャー' },
    'deck.board.decisions': { en: 'Decisions required', fr: 'Décisions requises', zh: '所需决策', ja: '必要な意思決定' },
    'deck.board.accepting': { en: 'Accept vs. remediate', fr: 'Accepter ou remédier', zh: '接受与整改的取舍', ja: 'リスク受容か是正か' },
    'deck.board.nextreview': { en: 'Next review', fr: 'Prochaine revue', zh: '下次复审', ja: '次回レビュー' },
    'deck.method.title': { en: 'Evidence basis & method', fr: 'Base probante et méthode', zh: '证据基础与方法', ja: '証跡の根拠と手法' },
    'deck.method.body': { en: 'Technical controls were evaluated against system-collected evidence drawn from source platforms across the full population of in-scope assets, not a sample. Governance, policy and supply-chain controls were evaluated by document review; process, response and recovery maturity by structured interview. {x} of {total} controls were evidenced by direct system collection; the remainder by documentation and interview.', fr: 'Les contrôles techniques ont été évalués à partir de preuves collectées par les systèmes depuis les plateformes sources, sur l’ensemble de la population des actifs du périmètre, et non sur un échantillon. Les contrôles de gouvernance, de politique et de chaîne d’approvisionnement ont été évalués par revue documentaire ; la maturité des processus, de la réponse et de la reprise, par entretien structuré. {x} des {total} contrôles ont été étayés par collecte directe des systèmes ; les autres par documentation et entretien.', zh: '技术控制项依据从源平台采集的系统证据进行评估，覆盖范围内资产的全体总量，而非抽样。治理、政策与供应链控制项通过文档审阅评估；流程、响应与恢复成熟度通过结构化访谈评估。{total} 项控制中有 {x} 项由系统直接采集取证，其余通过文档与访谈取证。', ja: '技術的統制は、対象資産の母集団全体（サンプルではなく）にわたり、ソースプラットフォームからシステムが収集した証跡に基づき評価しました。ガバナンス、方針、サプライチェーンの統制は文書レビューにより、プロセス・対応・復旧の成熟度は構造化インタビューにより評価しました。{total} 件の統制のうち {x} 件はシステムによる直接収集で裏付けられ、残りは文書とインタビューによります。' },
    'deck.rule.consequence': { en: 'Consequence before recommendation. Every number traces to the assessment; nothing is asserted that was not tested.', fr: 'La conséquence avant la recommandation. Chaque chiffre est traçable jusqu’à l’évaluation ; rien n’est affirmé qui n’ait été testé.', zh: '先陈述影响，再提出建议。每一个数字均可追溯至本次评估；未经检验者概不断言。', ja: '提言の前に、まず影響を示します。すべての数値は本評価に遡って裏付けられ、検証していない事項は一切主張しません。' },
    'deck.footer.conf': { en: 'Confidential', fr: 'Confidentiel', zh: '机密', ja: '機密' },
    'deck.btn': { en: 'Board deck (PPTX)', fr: 'Présentation pour le conseil (PPTX)', zh: '董事会演示文稿（PPTX）', ja: '取締役会向けデック（PPTX）' },
    'deck.generating': { en: 'Generating deck…', fr: 'Génération de la présentation…', zh: '正在生成演示文稿…', ja: 'デックを生成中…' },
    'deck.of5': { en: '{score} of 5', fr: '{score} sur 5', zh: '5 分中的 {score} 分', ja: '5 段階中 {score}' },
    'deck.cons.GV': { en: 'Governance gaps slow decisions and weaken accountability when an incident reaches the board.', fr: 'Les lacunes de gouvernance ralentissent les décisions et affaiblissent la responsabilité lorsqu’un incident remonte au conseil.', zh: '治理缺口会拖慢决策，并在事件上报至董事会时削弱问责。', ja: 'ガバナンスの欠落は意思決定を遅らせ、インシデントが取締役会に達した際の説明責任を弱めます。' },
    'deck.cons.ID': { en: 'Unmanaged assets and unassessed risks are exposure the organization cannot see or price.', fr: 'Les actifs non gérés et les risques non évalués constituent une exposition que l’organisation ne peut ni voir ni chiffrer.', zh: '未纳管的资产与未评估的风险，是组织无法看见、也无法定价的风险敞口。', ja: '管理されていない資産と評価されていないリスクは、組織が把握も価格付けもできないエクスポージャーです。' },
    'deck.cons.PR': { en: 'Protective-control gaps leave crown-jewel systems reachable by a determined attacker.', fr: 'Les lacunes des contrôles de protection laissent les systèmes critiques accessibles à un attaquant déterminé.', zh: '防护控制缺口会使核心资产系统暴露于有备而来的攻击者面前。', ja: '防御統制の欠落により、重要資産システムが執拗な攻撃者の到達可能な状態に置かれます。' },
    'deck.cons.DE': { en: 'Detection blind spots extend dwell time — an intrusion runs longer before it is seen.', fr: 'Les angles morts de détection allongent le temps de présence — une intrusion perdure plus longtemps avant d’être repérée.', zh: '检测盲区会延长驻留时间——入侵在被发现前将持续更久。', ja: '検知の死角は滞留時間を長引かせ、侵入が発見されるまでの時間を延ばします。' },
    'deck.cons.RS': { en: 'Response gaps lengthen containment and increase the business impact of an incident.', fr: 'Les lacunes de réponse allongent le confinement et accroissent l’impact d’un incident sur l’activité.', zh: '响应缺口会延长遏制时间，加大事件对业务的影响。', ja: '対応の欠落は封じ込めを長引かせ、インシデントの事業影響を拡大します。' },
    'deck.cons.RC': { en: 'Recovery gaps put continuity at risk if a critical service is disrupted.', fr: 'Les lacunes de reprise mettent en péril la continuité en cas d’interruption d’un service critique.', zh: '恢复缺口会在关键服务中断时危及业务连续性。', ja: '復旧の欠落は、重要サービスが中断した際に事業継続を危険にさらします。' },
    'deck.cons.GEN': { en: 'Control gaps here raise the likelihood and business impact of a security incident.', fr: 'Les lacunes de contrôle ici accroissent la probabilité et l’impact d’un incident de sécurité sur l’activité.', zh: '此处的控制缺口会提高安全事件发生的可能性及其对业务的影响。', ja: 'ここでの統制の欠落は、セキュリティインシデントの発生可能性と事業影響を高めます。' },
    'fw.foot.attr': { en: '{label} controls are referenced by identifier only, with Nerion-authored plain-English labels; the licensed standard text is not reproduced. ISO and CIS are trademarks of their respective owners (ISO; the Center for Internet Security). Nerion is independent and not affiliated with or endorsed by them.', fr: 'Les contrôles {label} sont référencés uniquement par identifiant, avec des libellés en langage clair rédigés par Nerion ; le texte sous licence de la norme n’est pas reproduit. ISO et CIS sont des marques de leurs propriétaires respectifs (ISO ; le Center for Internet Security). Nerion est indépendant et n’est ni affilié à ces organismes ni approuvé par eux.', zh: '{label} 控制项仅按标识符引用，并配以 Nerion 撰写的简明英文标签；不复制受许可的标准正文。ISO 与 CIS 分别为其各自所有者（ISO；互联网安全中心）的商标。Nerion 为独立机构，与上述机构无隶属关系，亦未获其认可。', ja: '{label} の制御項目は識別子のみで参照され、Nerion が作成した平易な英語のラベルが付されます。ライセンスされた規格の本文は複製されません。ISO および CIS は、それぞれの所有者（ISO、Center for Internet Security）の商標です。Nerion は独立しており、これらの団体と提携しておらず、また承認も受けていません。' },
    'ca.dek.lens':   { en: '<b>{label}</b> maturity is <b>crosswalk-derived</b> — each control is scored from the NIST CSF 2.0 evidence and live telemetry it maps to, so it moves with your real posture (a defensible readiness read, not a certified audit opinion — your assessor issues that). Open a domain, then a control, for its control-by-control detail.', fr: 'La maturité <b>{label}</b> est <b>dérivée par correspondance</b> — chaque contrôle est évalué à partir des preuves NIST CSF 2.0 et de la télémétrie en direct auxquelles il correspond, de sorte qu’elle évolue avec votre posture réelle (une lecture de préparation défendable, non une opinion d’audit certifiée — c’est votre auditeur qui l’émet). Ouvrez un domaine, puis un contrôle, pour le détail contrôle par contrôle.', zh: '<b>{label}</b> 的成熟度<b>源自交叉映射</b>——每项控制措施均依据其映射到的 NIST CSF 2.0 证据与实时遥测进行评分，因此会随您的真实态势而变化（这是一份可站得住脚的就绪度评估，而非经认证的审计意见——后者由您的审计机构出具）。展开某一领域，再点选某项控制措施，即可查看逐项明细。', ja: '<b>{label}</b> の成熟度は<b>クロスウォーク由来</b>です——各管理策は対応する NIST CSF 2.0 の証拠とライブテレメトリから採点されるため、実際の姿勢に応じて変動します（これは弁護可能な準備状況の評価であり、認証された監査意見ではありません——それは監査人が発行します）。ドメインを開き、次に管理策を開くと、管理策ごとの詳細が表示されます。' },
    'ca.dek.aifw':   { en: '<b>{label}</b> is an <b>AI-governance</b> framework, evidenced by <b>attestation</b> from your onboarding intake — there is no runtime AI security sensor yet, so this is a documented-posture read, not machine-verified assurance. <b>Governance is not assurance</b>: the score is honest about that gap. Open any control for how it was assessed, the finding and the fix.', fr: '<b>{label}</b> est un cadre de <b>gouvernance de l’IA</b>, attesté par <b>déclaration</b> issue de votre questionnaire d’intégration — il n’existe pas encore de capteur de sécurité IA en temps réel, il s’agit donc d’une lecture de posture documentée, non d’une assurance vérifiée par machine. <b>La gouvernance n’est pas l’assurance</b> : le score est honnête sur cet écart. Ouvrez un contrôle pour voir comment il a été évalué, le constat et la correction.', zh: '<b>{label}</b> 是一套 <b>AI 治理</b>框架，依据您入职问卷中的<b>声明</b>予以佐证——目前尚无实时 AI 安全传感器，因此这是一份记录在案的态势评估，而非经机器验证的保障。<b>治理不等于保障</b>：评分对这一差距如实反映。点选任一控制措施，即可查看其评估方式、发现与修复建议。', ja: '<b>{label}</b> は <b>AI ガバナンス</b>のフレームワークであり、オンボーディングの申告による<b>宣言</b>で裏付けられています——実行時の AI セキュリティセンサーはまだなく、これは文書化された姿勢の評価であって、機械検証済みの保証ではありません。<b>ガバナンスは保証ではありません</b>——スコアはその隔たりを正直に示します。任意の管理策を開くと、評価方法・所見・是正策が表示されます。' },
    'ca.finding':    { en: 'Your {subj} sits at <em>{level}</em> (CMMI Level {cmmi}) — {score} of 5, {target}.', fr: 'Votre {subj} se situe à <em>{level}</em> (niveau CMMI {cmmi}) — {score} sur 5, {target}.', zh: '您的{subj}处于 <em>{level}</em>（CMMI 等级 {cmmi}）——{score} 分（满分 5），{target}。', ja: 'あなたの{subj}は <em>{level}</em>（CMMI レベル {cmmi}）——5 点満点中 {score} 点、{target}。' },
    'ca.subj.prog':  { en: '{fw} program{scope}', fr: 'programme {fw}{scope}', zh: '{fw} 项目{scope}', ja: '{fw} プログラム{scope}' },
    'ca.subj.post':  { en: '{fw} posture{scope}', fr: 'posture {fw}{scope}', zh: '{fw} 安全态势{scope}', ja: '{fw} 態勢{scope}' },
    'ca.finding.forscope': { en: ' for {s}', fr: ' pour {s}', zh: '（{s}）', ja: '（{s}）' },
    'ca.finding.below':    { en: '<span class="bad">below the 3.5 target</span>', fr: '<span class="bad">sous la cible de 3,5</span>', zh: '<span class="bad">低于 3.5 的目标</span>', ja: '<span class="bad">目標 3.5 を下回っています</span>' },
    'ca.finding.at':       { en: 'at the 3.5 target', fr: 'à la cible de 3,5', zh: '达到 3.5 的目标', ja: '目標 3.5 に到達' },
    'ca.prove.ai':   { en: 'You operate {total} AI-governance controls. <b>None are machine-verified</b> — AI governance has no runtime security sensor wired yet — so today’s assurance is <b>human-reviewed</b> ({tele}) or <b>attested</b> ({assert}), with {unproven} awaiting an AI-monitoring connector. Governance is not assurance: this is the gap between “we have a policy” and “we can prove it.”', fr: 'Vous exploitez {total} contrôles de gouvernance de l’IA. <b>Aucun n’est vérifié par machine</b> — la gouvernance de l’IA n’a pas encore de capteur de sécurité en temps réel — l’assurance d’aujourd’hui est donc <b>revue par un humain</b> ({tele}) ou <b>attestée</b> ({assert}), {unproven} attendant un connecteur de supervision de l’IA. La gouvernance n’est pas l’assurance : c’est l’écart entre « nous avons une politique » et « nous pouvons le prouver ».', zh: '您运行着 {total} 项 AI 治理控制措施。<b>没有一项经过机器验证</b>——AI 治理尚未接入任何实时安全传感器——因此当前的保障要么<b>经人工审阅</b>（{tele}），要么<b>仅为声明</b>（{assert}），另有 {unproven} 项等待接入 AI 监测连接器。治理不等于保障：这正是“我们有政策”与“我们能证明”之间的差距。', ja: 'あなたは {total} 件の AI ガバナンス管理策を運用しています。<b>機械検証済みは一つもありません</b>——AI ガバナンスにはまだランタイムのセキュリティセンサーが接続されていません——したがって現在の保証は<b>人手による確認</b>（{tele}）または<b>宣言</b>（{assert}）であり、{unproven} 件は AI 監視コネクターの接続待ちです。ガバナンスは保証ではありません。これは「方針がある」と「証明できる」の間の隔たりです。' }
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
