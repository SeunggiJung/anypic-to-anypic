import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // 변수가 아예 없으면 Next가 값을 박지 않아 AdSlot의 광고 분기를 번들에서 걷어내지 못한다. 항상 문자열로 고정한다.
  env: { NEXT_PUBLIC_ADS_ENABLED: process.env.NEXT_PUBLIC_ADS_ENABLED === "true" ? "true" : "false" },
  // 루트 레이아웃이 app/[lang] 아래에 있어서 전역 404 문서를 따로 둔다
  experimental: { globalNotFound: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
