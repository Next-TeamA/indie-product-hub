import { ProjectSidebar } from "@/components/layout/project-sidebar";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // TODO: Supabase에서 프로젝트 정보 조회
  const projectName = "TaskFlow";

  return (
    <div className="flex min-h-dvh bg-background">
      <ProjectSidebar projectId={id} projectName={projectName} />
      <main className="flex-1 overflow-y-auto flex justify-center">{children}</main>
    </div>
  );
}
