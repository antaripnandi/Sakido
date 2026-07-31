// SSR-safe browser stubs. Must be imported FIRST in prerender.tsx (side-effect
// import) so module-level code in components (e.g. gsap.registerPlugin) and any
// render-phase window/document reads never crash renderToStaticMarkup in Node.
//
// Uses Object.defineProperty because Node 22+ exposes read-only `navigator` /
// `localStorage` getters on globalThis that throw on plain assignment.

const noop = () => {};

const fakeClassList = {
  add: noop,
  remove: noop,
  contains: () => false,
  toggle: noop,
};

const fakeElement = {
  classList: fakeClassList,
  style: {},
  setAttribute: noop,
  getAttribute: () => null,
  appendChild: noop,
  removeChild: noop,
  addEventListener: noop,
  removeEventListener: noop,
  getContext: () => null,
  clientWidth: 0,
  clientHeight: 0,
  getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 }),
};

const defineGlobal = (key: string, value: unknown) => {
  try {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  } catch {
    // Some environments refuse — non-fatal for prerendering.
  }
};

defineGlobal('window', {
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
  addEventListener: noop,
  removeEventListener: noop,
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: noop,
  scrollTo: noop,
  location: { href: 'https://sakidoapp.vercel.app/' },
});

defineGlobal('document', {
  documentElement: fakeElement,
  body: fakeElement,
  getElementById: () => null,
  querySelector: () => null,
  createElement: () => ({ ...fakeElement }),
  addEventListener: noop,
  removeEventListener: noop,
  visibilityState: 'visible',
  title: '',
});

defineGlobal('localStorage', { getItem: () => null, setItem: noop, removeItem: noop });
defineGlobal('navigator', { userAgent: 'node-prerender' });

export {};
