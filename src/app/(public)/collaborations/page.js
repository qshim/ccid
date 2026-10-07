import Archive from '@/app/components/site/Archive';
import { visibleScheduled } from '@/app/data/scheduled';
// 예약 공개(scheduled.js)가 공개일에 맞춰 나타나도록 한 시간마다 다시 만든다.
export const revalidate = 3600;
export const metadata = { title: 'Projects — cciD', description: 'cciD의 프로젝트 이력. 연구 주제와 연도별로 살펴보세요.' };
export default function CollaborationsPage() { return <Archive extra={visibleScheduled()} />; }
