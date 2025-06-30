import { ProjectDetailArea } from "../../_components/domain/project/ProjectDetailArea/container";

type Props = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDetailPage({ params }: Props) {
  const { projectId } = await params;
  return <ProjectDetailArea projectId={projectId} />;
}