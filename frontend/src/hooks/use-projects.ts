import useSWR from "swr";
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  type Project,
  type ProjectCreateInput,
} from "@/lib/api/projects";

export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<Project[]>(
    "projects",
    listProjects,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );
  return { projects: data ?? [], error, isLoading, mutate };
}

export function useProject(projectId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Project>(
    projectId ? `projects/${projectId}` : null,
    () => getProject(projectId!),
    { revalidateOnFocus: false }
  );
  return { project: data, error, isLoading, mutate };
}

export function useProjectActions() {
  return {
    create: async (data: ProjectCreateInput) => {
      return createProject(data);
    },
    update: async (id: string, data: Partial<ProjectCreateInput>) => {
      return updateProject(id, data);
    },
    remove: async (id: string) => {
      return deleteProject(id);
    },
  };
}
