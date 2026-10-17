import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Direct visits to a lazy route otherwise wait for the entry module to discover
 * the chunk. Start that chunk (and its CSS) from index.html when the URL matches.
 */
function preloadLazyRoutes(): Plugin {
  const routes: Array<{ test: string; name: string }> = [
    { test: "p==='/map'||p.indexOf('/locality/')===0", name: 'MapPage' },
    { test: "p==='/wards'", name: 'WardsPage' },
    { test: "p==='/how'", name: 'HowPage' },
    { test: "p==='/localities'", name: 'LocalitiesPage' },
  ];

  return {
    name: 'preload-lazy-routes',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;
        const files = Object.values(bundle).map((item) => item.fileName);
        const pick = (name: string, ext: string) =>
          files.find((file) => file.includes(`/${name}-`) && file.endsWith(ext));
        const branches = routes
          .map((route) => {
            const js = pick(route.name, '.js');
            if (!js) return '';
            const css = pick(route.name, '.css');
            const cssCall = css ? `add(${JSON.stringify(css)},'stylesheet');` : '';
            return `if(${route.test}){add(${JSON.stringify(js)},'modulepreload');${cssCall}}`;
          })
          .join('');
        if (!branches) return html;
        const script =
          `<script>(function(){var p=location.pathname;function add(h,rel){var l=document.createElement('link');l.rel=rel;l.href='/'+h;if(rel==='modulepreload')l.crossOrigin='';document.head.appendChild(l);} ${branches}})();</script>`;
        return html.replace('</head>', `${script}</head>`);
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), preloadLazyRoutes()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/v1': 'http://127.0.0.1:8787',
      '/health': 'http://127.0.0.1:8787',
    },
  },
});
