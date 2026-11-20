// Responsive image from Unsplash's image CDN.
// - srcset: the browser downloads only the width it needs (a phone never pulls a 1600px file)
// - auto=format: the CDN serves AVIF/WebP when the browser supports it
// - width/height: reserves space so the layout does not jump while loading (no CLS)
// - loading="lazy": off-screen images wait until the user scrolls near them

const WIDTHS = [360, 540, 720, 960, 1280, 1600];

interface ImgProps {
  id: string;
  alt: string;
  ratio?: number; // height / width, e.g. 1.25 for 4:5 portrait
  sizes?: string;
  priority?: boolean; // true only for the main above-the-fold image
  className?: string;
}

const src = (id: string, w: number, ratio: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${Math.round(w * ratio)}&fit=crop&auto=format&q=70`;

export default function Img({ id, alt, ratio = 1.25, sizes = "100vw", priority = false, className }: ImgProps) {
  return (
    <img
      className={className}
      src={src(id, 720, ratio)}
      srcSet={WIDTHS.map((w) => `${src(id, w, ratio)} ${w}w`).join(", ")}
      sizes={sizes}
      width={720}
      height={Math.round(720 * ratio)}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
    />
  );
}
