declare module "next-pwa" {
  import type { NextConfig } from "next";

  type RuntimeCachingRule = {
    urlPattern: RegExp;
    handler: string;
    options?: Record<string, unknown>;
  };

  type PwaOptions = {
    dest: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    runtimeCaching?: RuntimeCachingRule[];
  };

  export default function withPWA(
    options: PwaOptions,
  ): (config: NextConfig) => NextConfig;
}
