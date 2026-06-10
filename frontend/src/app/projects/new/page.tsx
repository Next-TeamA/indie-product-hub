"use client";

import { useReducer, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/lib/api/projects";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { Stepper } from "@/components/onboarding/stepper";
import { PrdStep } from "@/components/onboarding/prd-step";
import { GithubStep } from "@/components/onboarding/github-step";
import {
  DeployStep,
  type DraftDeployment,
  type DraftDependency,
} from "@/components/onboarding/deploy-step";
import { SnsStep } from "@/components/onboarding/sns-step";
import { CompleteStep } from "@/components/onboarding/complete-step";
import {
  createPlatformDeployment,
  createDependency as createDeployDependency,
} from "@/lib/api/platform-deployments";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const STORAGE_KEY = "onboarding_state";

type Stage = "prd" | "github" | "deploy" | "sns" | "complete";

const STEPS: Stage[] = ["prd", "github", "deploy", "sns", "complete"];

type State = {
  stage: Stage;
  projectName: string;
  projectDescription: string;
  prd: string;
  repoUrl: string;
  github_repo_owner: string;
  github_repo_name: string;
  deploy_platform: string;
  deploy_project_id: string;
  deployments: DraftDeployment[];
  dependencies: DraftDependency[];
  selectedSns: string[];
};

type Action =
  | {
      type: "prd_done";
      payload: { name: string; description: string; prd: string };
    }
  | {
      type: "github_done";
      payload: {
        repoUrl: string;
        github_repo_owner: string;
        github_repo_name: string;
      };
    }
  | {
      type: "deploy_done";
      payload: {
        deployments: DraftDeployment[];
        dependencies: DraftDependency[];
      };
    }
  | { type: "sns_done"; payload: { selectedSns: string[] } }
  | { type: "back" }
  | { type: "restore"; payload: State };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "prd_done":
      return {
        ...state,
        stage: "github",
        projectName: action.payload.name,
        projectDescription: action.payload.description,
        prd: action.payload.prd,
      };
    case "github_done":
      return {
        ...state,
        stage: "deploy",
        repoUrl: action.payload.repoUrl,
        github_repo_owner: action.payload.github_repo_owner,
        github_repo_name: action.payload.github_repo_name,
      };
    case "deploy_done": {
      const primary = action.payload.deployments[0];
      return {
        ...state,
        stage: "sns",
        // legacy fields -- 첫 deployment 를 primary 로 박아둠 (기존 sync 코드 호환)
        deploy_platform: primary?.platform ?? "",
        deploy_project_id: primary?.external_project_id ?? "",
        deployments: action.payload.deployments,
        dependencies: action.payload.dependencies,
      };
    }
    case "sns_done":
      return {
        ...state,
        stage: "complete",
        selectedSns: action.payload.selectedSns,
      };
    case "back": {
      const currentIndex = STEPS.indexOf(state.stage);
      if (currentIndex <= 0) return state;
      return { ...state, stage: STEPS[currentIndex - 1] };
    }
    case "restore":
      return action.payload;
    default:
      return state;
  }
}

const initialState: State = {
  stage: "prd",
  projectName: "",
  projectDescription: "",
  prd: "",
  repoUrl: "",
  github_repo_owner: "",
  github_repo_name: "",
  deploy_platform: "",
  deploy_project_id: "",
  deployments: [],
  dependencies: [],
  selectedSns: [],
};

function saveState(state: State) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function loadState(): State | null {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as State;
    }
  } catch {
    // ignore
  }
  return null;
}

function clearState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default function NewProjectPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isCreating, setIsCreating] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const createInFlightRef = useRef(false);
  const currentIndex = STEPS.indexOf(state.stage);
  const router = useRouter();

  // Restore state from sessionStorage on mount (after OAuth / GitHub App redirect).
  // 새로고침을 해도 stage 가 유지되도록 state 는 지우지 않고 그대로 둠.
  // 프로젝트 생성이 끝난 시점에서만 clearState() 호출.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = loadState();
      if (saved) {
        dispatch({ type: "restore", payload: saved });
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Save state to sessionStorage before OAuth redirect
  const saveBeforeOAuth = useCallback(() => {
    saveState(state);
  }, [state]);

  async function handleSnsComplete(data: { selectedSns: string[] }) {
    if (createInFlightRef.current || isCreating || createdProjectId) return;
    createInFlightRef.current = true;
    setIsCreating(true);
    try {
      const project = await createProject({
        name: state.projectName,
        description: state.projectDescription || undefined,
        prd: state.prd || undefined,
        github_repo_url: state.repoUrl || undefined,
        github_repo_owner: state.github_repo_owner || undefined,
        github_repo_name: state.github_repo_name || undefined,
        deploy_platform: state.deploy_platform || undefined,
        deploy_project_id: state.deploy_project_id || undefined,
        sns_channels: data.selectedSns,
      });

      // Multi-deployment 등록
      const localIdToServerId: Record<string, string> = {};
      for (const d of state.deployments) {
        try {
          const created = await createPlatformDeployment(project.id, {
            platform: d.platform,
            external_project_id: d.external_project_id,
            name: d.name,
            role: d.role,
            framework: d.framework,
            external_url: d.external_url,
          });
          localIdToServerId[d.local_id] = created.id;
        } catch (e) {
          console.error("deployment 등록 실패", e);
        }
      }
      for (const dep of state.dependencies) {
        const src = localIdToServerId[dep.source_local_id];
        const tgt = localIdToServerId[dep.target_local_id];
        if (!src || !tgt) continue;
        try {
          await createDeployDependency(project.id, src, tgt, dep.kind);
        } catch (e) {
          console.error("dependency 등록 실패", e);
        }
      }

      setCreatedProjectId(project.id);
      dispatch({ type: "sns_done", payload: data });
    } catch (e) {
      console.error("Failed to create project:", e);
      createInFlightRef.current = false;
    } finally {
      setIsCreating(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="onboard-shell">
      <div className="onboard-mesh" />
      <div className="onboard-grain" />

      {state.stage !== "complete" && (
        <>
          <button
            onClick={() => router.push("/projects")}
            className="fixed top-6 left-6 z-50 w-9 h-9 rounded-full flex items-center justify-center
                       text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <Stepper steps={STEPS.slice(0, -1)} currentIndex={currentIndex} />
        </>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={state.stage}
          className="w-full flex items-center justify-center"
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        >
          {state.stage === "prd" && (
            <PrdStep
              onNext={(data) => dispatch({ type: "prd_done", payload: data })}
            />
          )}
          {state.stage === "github" && (
            <GithubStep
              onNext={(data) =>
                dispatch({ type: "github_done", payload: data })
              }
              onBack={() => dispatch({ type: "back" })}
              onBeforeOAuth={saveBeforeOAuth}
            />
          )}
          {state.stage === "deploy" && (
            <DeployStep
              onNext={(data) =>
                dispatch({ type: "deploy_done", payload: data })
              }
              onBack={() => dispatch({ type: "back" })}
              onBeforeOAuth={saveBeforeOAuth}
            />
          )}
          {state.stage === "sns" && (
            <SnsStep
              onNext={handleSnsComplete}
              onBack={() => dispatch({ type: "back" })}
              onBeforeOAuth={saveBeforeOAuth}
              isSubmitting={isCreating}
            />
          )}
          {state.stage === "complete" && (
            <CompleteStep
              projectName={state.projectName}
              projectId={createdProjectId}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
