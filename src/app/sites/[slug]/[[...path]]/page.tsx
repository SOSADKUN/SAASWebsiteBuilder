import { notFound } from "next/navigation";
import { publicData } from "@/server/queries";
import { WebsiteRenderer } from "@/components/website/registry";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string; path?: string[] }> };
export async function generateMetadata({ params }: Props) {
  const { slug, path } = await params;
  const data = await publicData(
    slug,
    path?.length ? "/" + path.join("/") : "/",
  );
  return {
    title: data
      ? `${data.page.title} · ${data.business.name}`
      : "Website not found",
    description: data?.business.description,
  };
}
export default async function PublicSite({ params }: Props) {
  const { slug, path } = await params;
  const data = await publicData(
    slug,
    path?.length ? "/" + path.join("/") : "/",
  );
  if (!data) notFound();
  return (
    <WebsiteRenderer
      sections={data.page.published!}
      business={data.business}
      products={data.products}
    />
  );
}
