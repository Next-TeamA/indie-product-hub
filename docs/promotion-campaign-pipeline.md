# Threads 홍보 캠페인 생성 파이프라인 고도화 정리

## 목적

IndieOps의 홍보 캠페인 생성 기능은 단순히 “홍보글 14개”를 만드는 것이 아니라, 완성된 프로덕트를 운영하는 사람이 Threads에서 실제로 계정을 운영하는 것처럼 보이는 2주 콘텐츠 흐름을 만드는 것을 목표로 한다.

기존 방식은 제품 기능, 문제 제기, CTA 중심의 광고성 게시물이 많이 생성되는 한계가 있었다.  
이번 고도화에서는 Threads 특성에 맞게 운영자 캐릭터, 숏폼 운영글, 스친/스하리/반하리 문화, 제품 요청글의 리듬을 캠페인 안에 반영하도록 구조를 개선했다.

## 기존 문제

기존 14일 캠페인 생성은 다음 흐름이었다.

```text
타겟 분석
→ 캠페인 전략
→ 14일 콘텐츠 캘린더
→ 게시물 초안 작성
→ 최종 검수
→ 14개 초안 저장
이 구조에서는 다음 문제가 있었다.

각 게시물이 제품 홍보문처럼 보임
“지금 바로 확인해보세요” 같은 광고성 CTA가 반복됨
운영자가 실제 사람처럼 느껴지지 않음
Threads에서 반응이 잘 나는 구걸형, 혼잣말형, 스친형 콘텐츠가 부족함
14개 글이 모두 비슷한 제품 소개/문제 해결 구조로 수렴함
개선 방향
개선 방향은 “좋은 광고글 14개”가 아니라 “한 사람이 2주 동안 계정을 운영한 것 같은 흐름”을 만드는 것이다.

핵심 원칙은 다음과 같다.

첫 게시물은 제품 정체성을 명확히 소개한다.
이후 게시물은 운영자 숏폼 글 중심으로 구성한다.
3~4개마다 제품 사용 요청글을 섞는다.
스친, 스하리, 반하리 같은 Threads 문화 언어를 일부 사용한다.
광고문처럼 보이는 표현은 줄인다.
완성된 제품을 미완성 MVP처럼 말하지 않는다.
현재 파이프라인 구조
고도화된 파이프라인은 다음과 같다.

1. Target Analysis
   타겟 사용자, pain point, desire, attention hook 분석

2. Campaign Strategy
   캠페인 목표, 운영자 캐릭터, 콘텐츠 원칙, 리듬 전략 생성

3. Threads Operating Rhythm
   14일 동안 어떤 유형의 글을 어떤 순서로 배치할지 설계

4. Calendar Planning
   리듬을 기반으로 날짜별 주제, hook style, CTA, tone element 생성

5. Draft Writing
   각 날짜의 역할 카드에 맞춰 실제 Threads 게시물 작성

6. Final Review
   광고성, 반복성, 제품명 과다 노출, 숏폼 비율, Threads 말투 검수

7. Save Drafts
   14개 게시물을 promotion_posts에 draft로 저장
핵심 추가 단계: Threads Operating Rhythm
새로 추가된 핵심 단계는 threads_operating_rhythm이다.

이 단계는 게시물 본문을 작성하지 않고, 먼저 14일 콘텐츠의 리듬을 설계한다.

예시 구조:

{
  "day": 4,
  "postFormat": "product_request",
  "rhythmRole": "한 번 써봐달라고 솔직하게 부탁한다",
  "toneElements": ["부탁", "초기 사용자 찾기", "피드백 요청"],
  "ctaStrength": "high",
  "usePlatformLanguage": true,
  "productMentionLevel": "clear"
}
이 리듬 정보는 이후 캘린더 생성, 초안 작성, 최종 검수 단계에 모두 전달된다.

게시물 포맷
현재 사용하는 주요 postFormat은 다음과 같다.

product_intro
첫 게시물. 제품이 무엇인지, 누구를 위한 것인지 명확히 소개한다.

operator_shortform
운영자의 혼잣말, 민망함, 힘듦, 작은 일상, 반응 없음 등을 짧게 보여준다.

product_request
제품을 한 번 써봐달라고 직접 요청한다. 광고가 아니라 운영자의 부탁처럼 쓴다.

community_question
특정 타겟을 부르고 쉽게 답할 수 있는 질문을 던진다.

soft_feature
기능을 기능표처럼 설명하지 않고 실제 상황 속에서 자연스럽게 보여준다.

proof_or_progress
작은 성과, 운영일지, 작은 업데이트, 첫 반응 등을 공유한다.
리듬 생성 방식
초기에는 14일 리듬을 고정하는 방식도 검토했지만, 제품마다 홍보 목적과 타겟이 다르기 때문에 현재는 전략 기반으로 유동 생성한다.

구조는 다음과 같다.

캠페인 전략이 rhythmStrategy를 만든다.
↓
threads_operating_rhythm 단계가 14일 리듬을 생성한다.
↓
코드가 최소 규칙만 검증하고 보정한다.
즉, 완전 고정도 아니고 완전 자유 생성도 아니다.

코드 레벨 안전장치
LLM이 다시 광고성 캠페인으로 회귀하지 않도록 코드에서 최소 규칙을 보정한다.

보정 규칙:

Day 1은 반드시 product_intro
product_request는 3~4개 유지
operator 계열 글은 최소 8개 유지
스친/스하리/반하리 사용일은 3~6개로 제한
제품명 직접 언급은 최대 6개로 제한
이를 통해 리듬은 제품에 맞게 유동적으로 바뀌지만, Threads 운영글의 기본 구조는 유지된다.

문서 기반 프롬프트 관리
운영자형 Threads 캠페인 규칙은 코드에 모두 박아두지 않고 별도 md 문서로 분리했다.

파일:

backend/app/workspace/default_skills/threads_operator_campaign.md
이 문서에는 다음 내용이 포함된다.

완성된 제품 기준 캠페인 원칙
운영자 숏폼 글 작성 규칙
스친/스하리/반하리 사용 규칙
제품 요청글 작성 방식
미완성 빌드인퍼블릭처럼 보이지 않게 하는 금지 규칙
리듬 후보 패턴
이렇게 분리한 이유는 이후 SNS 운영 패턴이 바뀌거나 레퍼런스가 추가될 때 코드 수정 없이 문서만 수정해서 생성 품질을 개선하기 위해서다.

저장되는 데이터
캠페인 생성 과정은 Supabase에 단계별로 저장된다.

promotion_campaign_steps
각 생성 단계의 원본 결과가 저장된다.

확인할 수 있는 step:

target_analysis
campaign_strategy
threads_operating_rhythm
calendar_planning
draft_writing
review
promotion_campaigns
최종 캠페인 정보가 저장된다.

특히 campaign_strategy 안에 다음 값이 포함된다.

{
  "threadsOperatingRhythm": {
    "calendarRhythm": [...]
  }
}
promotion_posts
실제 14개 초안이 저장된다.

각 게시물의 campaign_meta에는 다음 정보가 들어간다.

{
  "postFormat": "operator_shortform",
  "toneElements": ["민망함", "자조"],
  "ctaStrength": "low",
  "usePlatformLanguage": true,
  "productMentionLevel": "implied"
}
이 정보를 통해 나중에 어떤 글이 어떤 전략적 역할로 생성되었는지 추적할 수 있다.

기대 효과
이번 고도화로 기대하는 변화는 다음과 같다.

광고성 게시물 감소
운영자 캐릭터 강화
Threads 네이티브 말투 반영
구걸형/혼잣말형/스친형 콘텐츠 생성 가능
14개 게시물의 역할 구분 명확화
생성 결과 디버깅 가능
프롬프트 문서 기반 개선 가능
결과적으로 IndieOps의 홍보 생성 기능은 단순 게시물 자동 생성에서, 제품 운영자의 SNS 계정 운영 흐름을 설계하는 기능으로 확장된다.

한 줄 요약
기존에는 제품을 홍보하는 글을 만들었다면,
이제는 제품을 운영하는 사람이 Threads에서 2주 동안 실제로 말하는 흐름을 만든다.


이 정도면 발표 자료로도 바로 쪼개서 쓸 수 있어요.

슬라이드로 만들면 섹션은 이렇게 나누면 좋습니다.

```text
1. 기존 문제
2. 개선 목표
3. 새 파이프라인
4. Threads Operating Rhythm
5. 데이터 저장/검증 구조
6. 기대 효과
그리고 아직 파일 생성은 안 했습니다.
