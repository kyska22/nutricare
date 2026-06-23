import { EvaluationDetail } from "@/components/admin/evaluation-detail";

interface EvaluationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EvaluationDetailPage({
  params,
}: EvaluationDetailPageProps) {
  const { id } = await params;
  return <EvaluationDetail evaluationId={id} />;
}
