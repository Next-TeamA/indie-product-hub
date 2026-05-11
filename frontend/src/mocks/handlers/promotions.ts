import { http, HttpResponse } from "msw";
import type {
  Promotion,
  PromotionCreateInput,
  PromotionUpdateInput,
  ProjectPromotionInfo,
  ProjectPromotionInfoUpdateInput,
} from "@/lib/api/promotion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Project Promotion Info store ---

const infoStore: Record<string, ProjectPromotionInfo> = {};

function defaultInfo(projectId: string): ProjectPromotionInfo {
  return {
    project_id: projectId,
    service_name: "TaskFlow",
    description: "체크박스 하나로 시작하는 PM 도구",
    target_user: "인디 메이커 / 1인 PM",
    key_values: "빈 줄에 한 줄 PRD가 됨\n체크박스로 진행 관리\n자동 일정 제안",
    site_url: "https://taskflow.app",
    default_hashtags: ["#인디메이커", "#빌드인퍼블릭", "#PM도구"],
    logo_url: null,
    updated_at: new Date().toISOString(),
  };
}

let store: Promotion[] = [
  {
    id: "promo-1",
    project_id: "mock",
    date: "2026-05-05",
    time: "09:00",
    platform: "threads",
    hook: "인디 PM 도구 론칭!",
    content:
      "드디어 론칭했습니다.\n체크박스 하나로 시작하는 PM 도구 TaskFlow를 소개합니다.\n→ 복잡한 노션 없이도 충분합니다.",
    hashtags: ["#인디메이커", "#빌드인퍼블릭", "#PM도구"],
    link: "https://taskflow.app",
    images: [],
    status: "published",
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-05T09:00:00Z",
  },
  {
    id: "promo-2",
    project_id: "mock",
    date: "2026-05-08",
    time: "10:00",
    platform: "bluesky",
    hook: "빌드인퍼블릭 #3",
    content:
      "이번 주 만든 것들:\n✅ 캘린더 뷰 완성\n✅ Supabase 연동\n🔧 API 설계 중\n\n작은 진전이지만 꾸준히.",
    hashtags: ["#빌드인퍼블릭", "#인디해커"],
    link: null,
    images: [],
    status: "published",
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-08T10:00:00Z",
  },
  {
    id: "promo-3",
    project_id: "mock",
    date: "2026-05-12",
    time: "09:00",
    platform: "threads",
    hook: "잠깐 기다려요",
    content:
      "체크박스 하나로 끝나는 PRD\n\nPM 도구는 너무 복잡합니다.\nTaskFlow는 체크박스 하나로 시작합니다.\n→ 빈 줄에 한 줄 쓰면 그게 PRD가 됩니다.",
    hashtags: ["#indie", "#PM", "#buildinpublic"],
    link: "https://taskflow.app",
    images: [],
    status: "scheduled",
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z",
  },
  {
    id: "promo-4",
    project_id: "mock",
    date: "2026-05-14",
    time: "11:00",
    platform: "bluesky",
    hook: "이슈 이제서야 해결",
    content:
      "3주 동안 저를 괴롭히던 버그를 드디어 잡았습니다.\n원인: 날짜 타임존 처리 실수.\n교훈: 항상 UTC로 저장하고 로컬에서 변환할 것.",
    hashtags: ["#개발일지", "#버그수정"],
    link: null,
    images: [],
    status: "scheduled",
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z",
  },
  {
    id: "promo-5",
    project_id: "mock",
    date: "2026-05-16",
    time: "09:00",
    platform: "bluesky",
    hook: "누레→개발 전환기",
    content:
      "디자이너에서 개발자로. 6개월간의 전환 이야기.\n제일 힘들었던 건 코드가 아니라 혼자 결정하는 것이었습니다.",
    hashtags: ["#인디메이커", "#커리어전환"],
    link: null,
    images: [],
    status: "draft",
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z",
  },
  {
    id: "promo-6",
    project_id: "mock",
    date: "2026-05-19",
    time: "09:00",
    platform: "threads",
    hook: "첫 달 회고",
    content:
      "론칭 한 달 회고\n\n→ 유저: 23명\n→ 주요 피드백: 모바일 지원 요청\n→ 다음 목표: 첫 유료 전환\n\n생각보다 빠르게 배우고 있습니다.",
    hashtags: ["#회고", "#인디메이커", "#빌드인퍼블릭"],
    link: null,
    images: [],
    status: "draft",
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z",
  },
  {
    id: "promo-7",
    project_id: "mock",
    date: "2026-05-21",
    time: "10:00",
    platform: "bluesky",
    hook: "업데이트 소식",
    content:
      "v0.3 업데이트 예고\n\n✨ 반복 일정 설정\n✨ 캘린더 내보내기\n✨ 다크모드\n\n이번 주말 배포 목표.",
    hashtags: ["#업데이트", "#TaskFlow"],
    link: "https://taskflow.app",
    images: [],
    status: "draft",
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z",
  },
  {
    id: "promo-8",
    project_id: "mock",
    date: "2026-05-23",
    time: "09:00",
    platform: "threads",
    hook: "업데이트 v0.3 출시",
    content:
      "v0.3이 나왔습니다!\n\n제일 많이 요청하신 기능들을 담았어요.\n피드백 주신 분들 감사합니다 🙏",
    hashtags: ["#TaskFlow", "#업데이트", "#인디메이커"],
    link: "https://taskflow.app",
    images: [],
    status: "draft",
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z",
  },
  {
    id: "promo-9",
    project_id: "mock",
    date: "2026-05-26",
    time: "10:00",
    platform: "x",
    hook: "Q&A: 왜 만들었나요?",
    content:
      "가장 많이 받는 질문: 왜 TaskFlow를 만들었나요?\n\n답: 기존 PM 도구들이 너무 무거웠습니다. 1인 개발자에게 Jira는 과합니다. 그래서 만들었습니다.",
    hashtags: ["#QandA", "#인디메이커", "#PM"],
    link: null,
    images: [],
    status: "draft",
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z",
  },
  {
    id: "promo-10",
    project_id: "mock",
    date: "2026-05-28",
    time: "09:00",
    platform: "mastodon",
    hook: "다음 기능 미리보기",
    content:
      "다음에 만들 기능을 먼저 보여드립니다.\nAI 기반 홍보 글 초안 생성.\n입력한 서비스 정보를 바탕으로 SNS 게시글을 자동으로 만들어줍니다.",
    hashtags: ["#미리보기", "#AI", "#TaskFlow"],
    link: null,
    images: [],
    status: "draft",
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z",
  },
];

export const promotionHandlers = [
  // GET /api/promotions?project_id=xxx
  http.get(`${API_URL}/api/promotions`, () => {
    return HttpResponse.json(store);
  }),

  // POST /api/promotions
  http.post(`${API_URL}/api/promotions`, async ({ request }) => {
    const body = (await request.json()) as PromotionCreateInput;
    const now = new Date().toISOString();
    const created: Promotion = {
      id: `promo-${Date.now()}`,
      hashtags: [],
      link: null,
      images: [],
      status: "draft",
      ...body,
      created_at: now,
      updated_at: now,
    };
    store.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  // PATCH /api/promotions/:id
  http.patch(`${API_URL}/api/promotions/:id`, async ({ params, request }) => {
    const { id } = params as { id: string };
    const body = (await request.json()) as PromotionUpdateInput;
    const idx = store.findIndex((p) => p.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: "Promotion not found" }, { status: 404 });
    }
    store[idx] = { ...store[idx], ...body, updated_at: new Date().toISOString() };
    return HttpResponse.json(store[idx]);
  }),

  // DELETE /api/promotions/:id
  http.delete(`${API_URL}/api/promotions/:id`, ({ params }) => {
    const { id } = params as { id: string };
    const idx = store.findIndex((p) => p.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: "Promotion not found" }, { status: 404 });
    }
    store.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /api/projects/:projectId/promotion-info
  http.get(`${API_URL}/api/projects/:projectId/promotion-info`, ({ params }) => {
    const { projectId } = params as { projectId: string };
    const info = infoStore[projectId] ?? defaultInfo(projectId);
    return HttpResponse.json(info);
  }),

  // PATCH /api/projects/:projectId/promotion-info
  http.patch(`${API_URL}/api/projects/:projectId/promotion-info`, async ({ params, request }) => {
    const { projectId } = params as { projectId: string };
    const body = (await request.json()) as ProjectPromotionInfoUpdateInput;
    const existing = infoStore[projectId] ?? defaultInfo(projectId);
    infoStore[projectId] = { ...existing, ...body, updated_at: new Date().toISOString() };
    return HttpResponse.json(infoStore[projectId]);
  }),
];
