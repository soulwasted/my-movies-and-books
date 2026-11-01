import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Ikonka „N“ v rohu zakrývá na mobilu první položku navigace (ISA-kompas).
  devIndicators: false,
  images: {
    // Zdroje (TMDB, Google Books, Open Library) už posílají zmenšené JPEGy ve
    // zvolené velikosti. Vercel optimizer jen přidával cold-start latenci a
    // bral limit transformací, takže se obrázky načítají přímo.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "image.pmgstatic.com" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
