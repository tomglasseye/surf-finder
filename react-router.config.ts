import type { Config } from "@react-router/dev/config";

export default {
  // Config options for Netlify static hosting
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: false,
  // Pre-render routes for better SEO and performance
  prerender: ["/", "/spots"],
  future: {
    v3_fetcherPersist: true,
    v3_relativeSplatPath: true,
    v3_throwAbortReason: true,
  },
} satisfies Config;
