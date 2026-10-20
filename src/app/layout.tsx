import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "RR Geleias Artesanais", template: "%s | RR Geleias" },
  description: "Geleias artesanais produzidas em pequenos lotes.",
  openGraph: { type: "website", locale: "pt_BR", siteName: "RR Geleias Artesanais" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
