import { TestSessionDetailArea } from "@/app/_components/domain/testSession/TestSessionDetailArea/container";

type Props = {
  params: Promise<{ projectId: string; sessionId: string }>;
};

export default async function TestSessionDetailPage({ params }: Props) {
  const { projectId, sessionId } = await params;
  
  return <TestSessionDetailArea projectId={projectId} sessionId={sessionId} />;
}