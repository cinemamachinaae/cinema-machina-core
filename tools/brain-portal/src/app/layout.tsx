import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cinema Machina Brain Portal",
  description:
    "Internal command center for Graphify intelligence, toolchain readiness, and brain documentation quality.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="font-sans antialiased h-full"
    >
      <body className="min-h-full flex flex-col bg-[#050505] text-white">
        <div className="relative z-[1] min-h-full flex flex-col">{children}</div>
      </body>
    </html>
  );
}
