"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/lib/api/projects";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { Stepper } from "@/components/onboarding/stepper";
import { PrdStep } from "@/components/onboarding/prd-step";
import { GithubStep } from "@/components/onboarding/github-step";
import { DeployStep } from "@/components/onboarding/deploy-step";
import { SnsStep } from "@/components/onboarding/sns-step";
import { CompleteStep } from "@/components/onboarding/complete-step";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

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
      payload: { deploy_platform: string; deploy_project_id: string };
    }
  | { type: "sns_done"; payload: { selectedSns: string[] } }
  | { type: "back" };

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
    case "deploy_done":
      return {
        ...state,
        stage: "sns",
        deploy_platform: action.payload.deploy_platform,
        deploy_project_id: action.payload.deploy_project_id,
      };
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
  selectedSns: [],
};

export default function NewProjectPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isCreating, setIsCreating] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const currentIndex = STEPS.indexOf(state.stage);
  const router = useRouter();

  async function handleSnsComplete(data: { selectedSns: string[] }) {
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
      setCreatedProjectId(project.id);
      dispatch({ type: "sns_done", payload: data });
    } catch (e) {
      console.error("Failed to create project:", e);
    } finally {
      setIsCreating(false);
    }
  }

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
            />
          )}
          {state.stage === "deploy" && (
            <DeployStep
              onNext={(data) =>
                dispatch({ type: "deploy_done", payload: data })
              }
              onBack={() => dispatch({ type: "back" })}
            />
          )}
          {state.stage === "sns" && (
            <SnsStep
              onNext={handleSnsComplete}
              onBack={() => dispatch({ type: "back" })}
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
