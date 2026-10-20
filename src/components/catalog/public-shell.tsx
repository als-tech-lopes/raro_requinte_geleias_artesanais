"use client";

import { AtSign as Instagram, LayoutDashboard, LogIn, Menu, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import { publicAssetUrl } from "@/services/catalog";
import type { CatalogSettings } from "@/types/catalog";
import { useCart } from "./cart-context";
import { PublicImage } from "./public-image";

const links = [
  { href: "/", label: "Início" },
  { href: "/catalogo", label: "Produtos" },
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
  const [open, setOpen] = useState(false);
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
      <header className="sticky top-0 z-40 border-b border-[#dfd4c2]/80 bg-[#fffdf8]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            {logoUrl ? (
              <PublicImage src={logoUrl} alt={`Logotipo ${settings.businessName}`} className="h-11 w-11 rounded-full" />
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--catalog-primary)] font-serif text-lg font-bold text-white">RR</span>
            )}
            <span>
              <strong className="block font-serif text-lg leading-none">{settings.businessName}</strong>
              <small className="mt-1 block text-[9px] font-bold uppercase tracking-[.22em] text-[var(--catalog-secondary)]">feito artesanalmente</small>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href)) ? "bg-[var(--catalog-primary)] text-white" : "text-[#5d554d] hover:bg-[#f0e7d9]"}`}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href={accountHref} title={adminName ? `Sessão de ${adminName}` : "Acessar área administrativa"} className="hidden items-center gap-2 rounded-full border border-[var(--catalog-primary)] px-4 py-2.5 text-sm font-bold text-[var(--catalog-primary)] transition hover:bg-[var(--catalog-primary)] hover:text-white sm:flex">
              <AccountIcon size={18} />{accountLabel}
            </Link>
            <Link href="/sacola" aria-label={`Minha sacola, ${count} itens`} className="relative rounded-full border border-[#dfd4c2] bg-white p-2.5 text-[var(--catalog-primary)]">
              <ShoppingBag size={20} />
              {count > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[var(--catalog-secondary)] px-1 text-[10px] font-bold text-white">{count}</span>}
            </Link>
            <button type="button" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} className="rounded-full border border-[#dfd4c2] bg-white p-2.5 lg:hidden" onClick={() => setOpen((value) => !value)}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="border-t border-[#e7dccb] bg-[#fffdf8] p-4 lg:hidden">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-semibold hover:bg-[#f4ecdf]">{link.label}</Link>
            ))}
            <div className="mt-2 border-t border-[#e7dccb] pt-2">
              <Link href={accountHref} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-[var(--catalog-primary)] hover:bg-[#f4ecdf]">
                <AccountIcon size={18} />{accountLabel}
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main>{children}</main>

      <footer className="mt-20 bg-[#24382d] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.2fr_.8fr_.8fr]">
          <div><p className="font-serif text-2xl font-bold">{settings.businessName}</p><p className="mt-3 max-w-md text-sm leading-6 text-white/65">{settings.shortDescription}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#dec7a1]">Navegue</p><div className="mt-4 grid gap-2 text-sm text-white/70"><Link href="/catalogo">Nossas geleias</Link><Link href="/sobre">Nossa história</Link><Link href="/contato">Contato</Link><Link href={accountHref}>{accountLabel}</Link></div></div>
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#dec7a1]">Onde estamos</p><p className="mt-4 text-sm text-white/70">{[settings.city, settings.state].filter(Boolean).join(" — ") || "Consulte nossa área de atendimento"}</p>{instagram && <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold"><Instagram size={17} />@{instagram}</a>}</div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/45">Produtos artesanais. Disponibilidade e entrega sujeitas à confirmação.</div>
      </footer>
    </div>
  );
}
