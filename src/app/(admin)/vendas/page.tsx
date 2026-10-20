import { SalesManager } from "@/components/sales/sales-manager";

export default async function Page({ searchParams }: { searchParams: Promise<{ concluida?: string }> }) {
  const params = await searchParams;
  return <SalesManager completed={Boolean(params.concluida)} />;
}
