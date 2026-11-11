type PublicImageProps = {
  src: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  imageScale?: number;
};

export function PublicImage({ src, alt, className = "", priority = false, fit = "cover", imageScale = 100 }: PublicImageProps) {
  if (!src) return <span role="img" aria-label="Imagem não cadastrada" className={`grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#dcbfc0,transparent_35%),linear-gradient(145deg,#7c1839,#315c3e)] text-4xl text-white/70 ${className}`}>✦</span>;

  const backgroundImage = `url("${src.replaceAll('"', '%22')}")`;
  if (fit === "contain") {
    return <span role="img" aria-label={alt} data-priority={priority || undefined} className={`grid place-items-center overflow-hidden ${className}`}><span aria-hidden="true" className="block bg-contain bg-center bg-no-repeat" style={{ backgroundImage, width: `${imageScale}%`, height: `${imageScale}%` }} /></span>;
  }

  return <span role="img" aria-label={alt} data-priority={priority || undefined} className={`block bg-center ${className}`} style={{ backgroundImage, backgroundSize: "cover", backgroundRepeat: "no-repeat" }} />;
}
