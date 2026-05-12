"use client";

import { useReducer } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { Stepper } from "@/components/onboarding/stepper";
import { PrdStep } from "@/components/onboarding/prd-step";
import { GithubStep } from "@/components/onboarding/github-step";
import { SnsStep } from "@/components/onboarding/sns-step";
import { CompleteStep } from "@/components/onboarding/complete-step";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

type Stage = "prd" | "github" | "sns" | "complete";

const STEPS: Stage[] = ["prd", "github", "sns", "complete"];

type State = {
  stage: Stage;
  projectName: string;
  projectDescription: string;
  prd: string;
  repoUrl: string;
  selectedSns: string[];
};

type Action =
  | {
      type: "prd_done";
      payload: { name: string; description: string; prd: string };
    }
  | { type: "github_done"; payload: { repoUrl: string } }
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
        stage: "sns",
        repoUrl: action.payload.repoUrl,
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
  selectedSns: [],
};

export default function NewProjectPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const currentIndex = STEPS.indexOf(state.stage);
  const router = useRouter();

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
          {state.stage === "sns" && (
            <SnsStep
              onNext={(data) => dispatch({ type: "sns_done", payload: data })}
              onBack={() => dispatch({ type: "back" })}
            />
          )}
          {state.stage === "complete" && (
            <CompleteStep projectName={state.projectName} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
