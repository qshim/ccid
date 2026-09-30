import { Spectral } from "next/font/google";
import localFont from "next/font/local";

export const programme = localFont({
  src: "../fonts/Programme-Light.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const pxGrotesk = localFont({
  src: '../fonts/Px-Grotesk-Regular.woff2', // 경로 확인 (src 내부에서 접근)
  weight: '400',
  style: 'normal',
  display: 'swap',
});

export const pretendardB = localFont({
  src: '../fonts/Pretendard-Bold.subset.woff', // 경로 확인 (src 내부에서 접근)
  weight: '400',
  style: 'normal',
  display: 'swap',
});

export const pretendardR = localFont({
  // Variable font for smooth intermediate weights (e.g., 450)
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

export const neuehaas = localFont({
  src: '../fonts/NeueHaasGrotText-55Roman-Web.woff2', // 경로 확인 (src 내부에서 접근)
  weight: '400',
  style: 'normal',
  display: 'swap',
});
// 히어로의 강조 세리프. Georgia는 본래 화면의 작은 크기를 위해 그려진 서체라
// 89px 디스플레이에서는 의도된 용도를 벗어난다. Spectral은 큰 크기를 전제로 한
// 에디토리얼 세리프이고, ExtraLight(200)로 얇게 쓴다.
export const spectral = Spectral({
  subsets: ["latin"],
  weight: ["200", "300"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-spectral",
});
