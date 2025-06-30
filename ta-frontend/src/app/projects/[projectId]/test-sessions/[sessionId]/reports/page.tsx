import { TestReportListArea } from "@/app/_components/domain/testReport/TestReportListArea";

type Props = {
  params: Promise<{
    projectId: string;
    sessionId: string;
  }>;
};

export default async function TestReportListPage({ params }: Props) {
  const { projectId, sessionId } = await params;

  return (
    <TestReportListArea 
      projectId={projectId}
      sessionId={sessionId}
    />
  );
}