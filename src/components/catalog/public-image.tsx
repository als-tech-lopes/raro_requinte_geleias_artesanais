export function PublicImage({ src, alt, className = "", priority = false }: { src: string | null; alt: string; className?: string; priority?: boolean }) {
  return src
    ? <span role="img" aria-label={alt} data-priority={priority || undefined} className={`block bg-cover bg-center ${className}`} style={{ backgroundImage: `url("${src.replaceAll('"', '%22')}")` }} />
    : <span role="img" aria-label="Imagem não cadastrada" className={`grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#dcbfc0,transparent_35%),linear-gradient(145deg,#7c1839,#315c3e)] text-4xl text-white/70 ${className}`}>✦</span>;
}
