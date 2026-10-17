import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RR Geleias | Gestão artesanal",
  description: "Gestão de produtos da RR Geleias Artesanais.",
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
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
