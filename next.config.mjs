import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Fix Turbopack picking the wrong workspace root when multiple lockfiles exist.
    root: __dirname,
  },
  // dev 화면의 Next.js 표시기(좌하단 아이콘) 숨김.
  devIndicators: false,
};

export default nextConfig;
