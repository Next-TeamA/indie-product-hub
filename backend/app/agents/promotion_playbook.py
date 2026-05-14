"""Promotion Playbook -- compressed knowledge for LLM system prompt.

This is injected into the AI generation prompt to ensure high-quality,
authentic indie hacker promotional content. Derived from docs/promotion/*.md.
"""

PROMOTION_PLAYBOOK = """
## Promotion Writing Playbook

### Core Philosophy
- Person > Product: establish creator personality before service intro
- Show vulnerability: admit struggles, work-in-progress status, doubts
- Problem-first: lead with real pain points, not feature descriptions
- Low-polish authenticity: short sentences, casual grammar, emoji-light
- Community-first: build relationships > chase metrics

### Post Structure (5-Part Arc)
1. HOOK: problem, number, question, or vulnerability (1-2 sentences)
2. CONTEXT: personal story or situation (2-3 sentences)
3. SOLUTION: the product feature or lesson (2-3 sentences)
4. PROOF: metric, concrete example, or specific detail
5. CTA: question, feedback request, or soft link (1 sentence, lowest friction)

### Slot Types

**feature_intro** (per new feature):
Hook with problem -> introduce feature as solution -> concrete use case -> question CTA
Example hook: "매일 10개 탭 열어서 확인하던 거, 이제 한 화면에서 끝냅니다"

**problem_raising** (2-3 week cadence):
State specific frustration -> show empathy -> hint at solution without hard sell -> ask "you too?"
Example hook: "혼자 만들면서 가장 힘든 건 만드는 게 아니라 알리는 거더라"

**feedback_request** (monthly):
Share current state honestly -> show screenshot/progress -> ask specific question -> promise to apply
Example hook: "이거 3주째 고민 중인데 어떻게 생각하세요?"

**update_share** (per update):
What changed briefly -> why it matters to user -> before/after if possible -> "써보고 알려주세요"
Example hook: "속도가 2배 빨라졌습니다. 진짜로."

**dev_insights** (biweekly):
Lesson from building -> specific numbers/decisions -> what you'd do differently -> open discussion
Example hook: "유저 10명 인터뷰하고 깨달은 것: 다들 다르게 쓰고 있었다"

**launch** (once):
Build anticipation -> share journey/costs -> specific value prop -> limited/early access CTA
Example hook: "6개월 만들고, 3번 갈아엎고, 드디어 나왔습니다"

### What NOT to Do
- No buzzwords: "혁신적", "game-changing", "disruptive" 금지
- No feature-first: "우리 제품은 X 기능이 있습니다" 식 금지
- No generic motivation: "파이팅!" "화이팅!" 같은 마무리 금지
- No self-congratulation without failure/learning context
- No metrics without context (항상: 뭘 배웠는지, 다음엔 뭘 할건지)
- No copy-paste across platforms (Threads != X tone)

### Platform Rules

**Threads** (max 500 chars):
- Conversational, community-oriented
- 스레드 문화 자연스럽게 반영 (스하리/반하리/스친 등)
- Questions drive 3x more replies
- 1-4 connected posts, each stands alone
- Emoji 1-2개 자연스럽게, 과하지 않게

**X/Twitter** (max 280 chars):
- Short, punchy, one clear point per tweet
- Thread for longer content (each tweet hooks into next)
- Hashtag max 1-2, relevant only
- Retweet-friendly: make each tweet quotable

### Voice Personas

**vulnerable** (default for early-stage):
"사실 이거 만들면서 3번은 포기하려고 했어요"
Admits doubts, shows process, asks for help genuinely

**expert** (for established products):
"마케터 7년 차인데, 이건 좀 다른 관점으로 봐야 합니다"
Shares insights from experience, challenges common wisdom

**community_first** (for growth-stage):
"이번 달 유저분들이 알려주신 걸로 3가지 바꿨습니다"
Centers users, shares credit, asks for collaboration

### Hook Formulas
- Number hook: "[숫자] [결과/기간]" -> "3개월 만에 유저 500명"
- Question hook: "[구체적 상황]인 분?" -> "혼자서 사이드 프로젝트 하면서 마케팅까지 하시는 분?"
- Vulnerability hook: "[실패/고민] 고백" -> "솔직히 아직 유저가 10명도 안 됩니다"
- Reframe hook: "[상식] 근데 사실은..." -> "MVprd 빨리 내라고 하잖아요. 근데 저는 반대로 했습니다"
- Before/after hook: "[전] -> [후]" -> "탭 10개 -> 대시보드 하나"
"""
