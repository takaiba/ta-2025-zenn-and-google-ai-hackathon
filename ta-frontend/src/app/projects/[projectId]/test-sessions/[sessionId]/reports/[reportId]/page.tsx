import { TestReportDetailArea } from "@/app/_components/domain/testReport/TestReportDetailArea";

type Props = {
  params: Promise<{
    projectId: string;
    sessionId: string;
    reportId: string;
  }>;
};

export default async function TestReportDetailPage({ params }: Props) {
  const { projectId, sessionId, reportId } = await params;

  return (
    <TestReportDetailArea 
      projectId={projectId}
      sessionId={sessionId}
      reportId={reportId}
    />
  );
}