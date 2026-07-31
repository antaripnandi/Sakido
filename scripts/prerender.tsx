// Build-time static prerender for the 5 public routes (/, /privacy, /terms,
// /cookie-policy, /contact). Runs AFTER `vite build` and writes real static
// HTML per route with per-route <title>, <meta description>, H1s and real
// <a> links — fixing the SEO audit (duplicate title, missing H1/description,
// no outgoing links, thin content, orphan pages) at the server-HTML level.
//
// Zero new dependencies: react-dom/server (renderToStaticMarkup) +
// react-router MemoryRouter, both already installed.

import './prerender-shim'; // MUST be first — SSR-safe browser stubs

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';

import { LegalPage } from '../src/components/legal/LegalPage';
import { SakidoLandingPage } from '../src/components/SakidoLandingPage';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
const template = readFileSync(`${distDir}index.html`, 'utf8');

interface RouteDef {
  path: string;
  outFile: string;
  title: string;
  description: string;
  element: ReactElement;
}

const routes: RouteDef[] = [
  {
    path: '/',
    outFile: 'index.html',
    title: 'Sakido — Unified Academic Portal for Students',
    description:
      'Sakido unifies notes, calendar, tasks, flashcards, and saved links into one distraction-free academic workspace for students.',
    element: <SakidoLandingPage onOpenDashboard={() => {}} />,
  },
  {
    path: '/privacy',
    outFile: 'privacy.html',
    title: 'Privacy Policy — Sakido',
    description:
      'How Sakido collects, stores, and protects your data — GDPR, CCPA, and Google API Services User Data Policy compliance.',
    element: <LegalPage initialTab="privacy" />,
  },
  {
    path: '/terms',
    outFile: 'terms.html',
    title: 'Terms of Service — Sakido',
    description:
      'The terms that govern your use of Sakido — permitted use, user obligations, intellectual property, and liability limits.',
    element: <LegalPage initialTab="terms" />,
  },
  {
    path: '/cookie-policy',
    outFile: 'cookie-policy.html',
    title: 'Cookie &amp; Storage Policy — Sakido',
    description:
      'How Sakido uses cookies and local storage — essential session cookies, preferences, and zero third-party ad trackers.',
    element: <LegalPage initialTab="cookies" />,
  },
  {
    path: '/contact',
    outFile: 'contact.html',
    title: 'Contact & Support — Sakido',
    description:
      'Contact the Sakido support team for privacy, account deletion, or technical support inquiries.',
    element: <LegalPage initialTab="contact" />,
  },
];

for (const route of routes) {
  // MemoryRouter supplies Router context so Link/useNavigate work during SSR.
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={[route.path]}>{route.element}</MemoryRouter>
  );

  const html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`)
    .replace(
      '<meta name="viewport"',
      `<meta name="description" content="${route.description}" />\n    <meta name="viewport"`
    )
    .replace('<div id="root"></div>', `<div id="root">${markup}</div>`);

  writeFileSync(`${distDir}${route.outFile}`, html);
  console.log(`[prerender] ${route.path} -> ${route.outFile}`);
}

console.log('[prerender] done — 5 routes written');
