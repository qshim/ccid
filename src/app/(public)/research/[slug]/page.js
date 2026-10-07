import { notFound } from 'next/navigation';
import { themes } from '@/app/data/research';
import ResearchDetail from '@/app/components/site/ResearchDetail';
import { visibleScheduled } from '@/app/data/scheduled';
// 예약 공개(scheduled.js)가 공개일에 맞춰 나타나도록 한 시간마다 다시 만든다.
export const revalidate = 3600;
export function generateStaticParams() { return themes.map(t => ({ slug: t.id })); }
export async function generateMetadata({ params }) {
  const { slug } = await params; const theme = themes.find(t => t.id === slug);
  if (!theme) return {};
  return { title: `${theme.title} — cciD`, description: theme.intro, openGraph: { title: `${theme.title} — cciD`, description: theme.intro, images: [theme.image] } };
}
export default async function ResearchPage({ params }) {
  const { slug } = await params; const theme = themes.find(t => t.id === slug);
  if (!theme) notFound();
  return <ResearchDetail theme={theme} extra={visibleScheduled().filter(p => p.themes.includes(theme.id))}/>;
}
