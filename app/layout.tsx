import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carlos & Silvia · Forever",
  description: "隔着国界，共享同一刻日落，也在同一本日记里醒来。属于 Carlos 与 Silvia 的双人日记和回忆空间。",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Carlos & Silvia · Forever",
    description: "世界很大，而我的坐标是你。",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Carlos 与 Silvia 的恋爱日记" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
