import HomeClient from "@/app/HomeClient";
import { visibleScheduled } from "@/app/data/scheduled";

// 예약 공개(scheduled.js)가 공개일에 맞춰 나타나도록 한 시간마다 다시 만든다.
export const revalidate = 3600;

export default function Home() {
  return <HomeClient extra={visibleScheduled()} />;
}
