import { TestSessionListArea } from "@/app/_components/domain/testSession/TestSessionListArea/container";

type Props = {
  params: Promise<{ projectId: string }>;
};

export default async function TestSessionsPage({ params }: Props) {
  const { projectId } = await params;
  
  return <TestSessionListArea projectId={projectId} />;
}