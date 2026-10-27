"use client";

import { AtSign as Instagram, LayoutDashboard, LogIn, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { publicAssetUrl } from "@/services/catalog";
import type { CatalogSettings } from "@/types/catalog";
import { useCart } from "./cart-context";
import { JamClickEffect } from "./jam-click-effect";
import { PublicImage } from "./public-image";

const links = [
  { href: "/", label: "Início" },
  { href: "/catalogo", label: "Produtos" },
  { href: "/galeria", label: "Galeria" },
  { href: "/sobre", label: "Sobre nós" },
  { href: "/depoimentos", label: "Depoimentos" },
  { href: "/contato", label: "Contato" },
];

type PublicShellProps = {
  settings: CatalogSettings;
  adminName?: string;
  children: ReactNode;
};

export function PublicShell({ settings, adminName, children }: PublicShellProps) {
  const pathname = usePathname();
  const { count } = useCart();
  const style = {
    "--catalog-primary": settings.primaryColor,
    "--catalog-secondary": settings.secondaryColor,
  } as CSSProperties;
  const logoUrl = publicAssetUrl("public-media", settings.logoPath);
  const instagram = settings.instagram.replace(/^@/, "");
  const accountHref = adminName ? "/dashboard" : "/login";
  const accountLabel = adminName ? "Ir para o painel" : "Entrar";
  const AccountIcon = adminName ? LayoutDashboard : LogIn;

  return (
    <div style={style} className="catalog-public min-h-screen bg-[#f7f1e5] text-[#29231d]">
      <JamClickEffect />
      <header className="sticky top-0 z-40 border-b border-[#dfd4c2]/80 bg-[#fffdf8]/95 backdrop-blur-xl">
        <div className="desktop-public-frame mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:h-[76px] sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            {logoUrl ? (
              <PublicImage src={logoUrl} alt={`Logotipo ${settings.businessName}`} className="h-11 w-11 rounded-full" />
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--catalog-primary)] font-serif text-lg font-bold text-white">RR</span>
            )}
            <span className="min-w-0">
              <strong className="block max-w-[9.5rem] truncate font-serif text-base leading-none sm:max-w-[15rem] sm:text-lg">{settings.businessName}</strong>
              <small className="mt-1 hidden text-[9px] font-bold uppercase tracking-[.22em] text-[var(--catalog-secondary)] sm:block">feito artesanalmente</small>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href)) ? "bg-[var(--catalog-primary)] text-white" : "text-[#5d554d] hover:bg-[#f0e7d9]"}`}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link href={accountHref} title={adminName ? `Sessão de ${adminName}` : "Acessar área administrativa"} className="hidden items-center gap-2 rounded-full border border-[var(--catalog-primary)] px-4 py-2.5 text-sm font-bold text-[var(--catalog-primary)] transition hover:bg-[var(--catalog-primary)] hover:text-white sm:flex">
              <AccountIcon size={18} />{accountLabel}
            </Link>
            <Link href={accountHref} aria-label={accountLabel} title={accountLabel} className="rounded-full border border-[#dfd4c2] bg-white p-2.5 text-[var(--catalog-primary)] sm:hidden">
              <AccountIcon size={20} />
            </Link>
            <Link href="/sacola" aria-label={`Minha sacola, ${count} itens`} className="relative rounded-full border border-[#dfd4c2] bg-white p-2.5 text-[var(--catalog-primary)]">
              <ShoppingBag size={20} />
              {count > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[var(--catalog-secondary)] px-1 text-[10px] font-bold text-white">{count}</span>}
            </Link>
          </div>
        </div>

        <nav aria-label="Navegação principal" className="grid grid-cols-3 gap-1 border-t border-[#e7dccb] bg-[#fffdf8] px-3 py-2 sm:flex sm:items-center sm:justify-center sm:gap-1 sm:px-6 lg:hidden">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`rounded-full px-2 py-2 text-center text-[11px] font-semibold leading-tight transition sm:px-3 sm:text-sm ${active ? "bg-[var(--catalog-primary)] text-white shadow-sm" : "text-[#5d554d] hover:bg-[#f0e7d9]"}`}>{link.label}</Link>;
          })}
        </nav>
      </header>

      <main>{children}</main>

      <footer className="mt-20 bg-[#24382d] text-white">
        <div className="desktop-public-frame mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_.8fr_.8fr] lg:px-8 lg:py-12">
          <div><p className="font-serif text-2xl font-bold">{settings.businessName}</p><p className="mt-3 max-w-md text-sm leading-6 text-white/65">{settings.shortDescription}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#dec7a1]">Navegue</p><div className="mt-4 grid gap-2 text-sm text-white/70"><Link href="/catalogo">Nossas geleias</Link><Link href="/galeria">Galeria</Link><Link href="/sobre">Nossa história</Link><Link href="/contato">Contato</Link><Link href={accountHref}>{accountLabel}</Link></div></div>
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#dec7a1]">Onde estamos</p><p className="mt-4 text-sm text-white/70">{[settings.city, settings.state].filter(Boolean).join(" — ") || "Consulte nossa área de atendimento"}</p>{instagram && <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold"><Instagram size={17} />@{instagram}</a>}</div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/45">Produtos artesanais. Disponibilidade e entrega sujeitas à confirmação.</div>
      </footer>
    </div>
  );
}
