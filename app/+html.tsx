import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

const TITLE = 'Vinyl Roulette — Spin Your Vinyl Collection';
const DESCRIPTION =
  'Connect Discogs, answer a quick mood quiz, and get a personalized pick from records you already own. No streaming, no algorithms — just your shelf.';
const ORIGIN = 'https://vinyl-roulette.vercel.app';
const OG_IMAGE = `${ORIGIN}/favicon.ico`;
const THEME_COLOR = '#7a4cff';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="theme-color" content={THEME_COLOR} />
        <link rel="canonical" href={ORIGIN} />

        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={ORIGIN} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:site_name" content="Vinyl Roulette" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const GLOBAL_CSS = `
html, body { background-color: #ffffff; }
@media (prefers-color-scheme: dark) {
  html, body { background-color: #000000; }
}

/* Constrain the mobile-designed UI to a phone-width column on desktop screens */
@media (min-width: 768px) {
  body {
    background-color: #f3f1ee;
  }
  @media (prefers-color-scheme: dark) {
    body { background-color: #0c0c0e; }
  }
  #root {
    max-width: 480px;
    margin: 0 auto;
    min-height: 100vh;
    background-color: #ffffff;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
    overflow: hidden;
  }
  @media (prefers-color-scheme: dark) {
    #root { background-color: #0f0f12; box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4); }
  }
}
`;
