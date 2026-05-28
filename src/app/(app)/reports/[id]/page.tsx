import { ReportDetail } from "@/modules/reports/components/report-detail";
import { resolveRoleParam } from "@/modules/roles/route-role";

export const dynamic = "force-dynamic";

type ReportDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportDetailPage({ params, searchParams }: ReportDetailPageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const role = resolveRoleParam(resolvedSearchParams?.role);

  return <ReportDetail id={id} role={role} />;
}
