import { BugListArea } from "@/app/_components/domain/bug/BugListArea/container";

type Props = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectBugsPage({ params }: Props) {
  const { projectId } = await params;
  
  // Pass projectId directly instead of through URL params to avoid duplicate queries
  return (
    <div>
      <BugListArea projectId={projectId} />
    </div>
  );
}