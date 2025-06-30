import { BugDetailArea } from "@/app/_components/domain/bug/BugDetailArea/container";

type Props = {
  params: Promise<{ projectId: string; bugId: string }>;
};

export default async function BugDetailPage({ params }: Props) {
  const { projectId, bugId } = await params;
  
  return <BugDetailArea projectId={projectId} bugId={bugId} />;
}