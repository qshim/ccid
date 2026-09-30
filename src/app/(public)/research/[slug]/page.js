import { notFound } from 'next/navigation';
import { themes } from '@/app/data/research';
import ResearchDetail from '@/app/components/site/ResearchDetail';
export function generateStaticParams() { return themes.map(t => ({ slug: t.id })); }
export async function generateMetadata({ params }) {
  const { slug } = await params; const theme = themes.find(t => t.id === slug);
  if (!theme) return {};
  return { title: `${theme.title} — cciD`, description: theme.intro, openGraph: { title: `${theme.title} — cciD`, description: theme.intro, images: [theme.image] } };
}
export default async function ResearchPage({ params }) {
  const { slug } = await params; const theme = themes.find(t => t.id === slug);
  if (!theme) notFound();
  return <ResearchDetail theme={theme}/>;
}
