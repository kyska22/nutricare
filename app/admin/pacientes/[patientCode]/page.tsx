import { PatientOverview } from "@/components/admin/patient-overview";

export default async function PatientOverviewPage({
  params,
}: {
  params: Promise<{ patientCode: string }>;
}) {
  const { patientCode } = await params;
  return <PatientOverview patientCode={decodeURIComponent(patientCode)} />;
}
