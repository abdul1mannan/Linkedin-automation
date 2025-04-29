/** @type {import('next').NextConfig} */
const nextConfig = {
    
    webpack: (
      config,
      { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack },
    ) => {
 
      config.externals = config.externals || [];
      config.externals.push(
        "puppeteer-extra",
        "puppeteer-extra-plugin-stealth",
        "puppeteer-extra-plugin-adblocker",
        "puppeteer-extra-plugin-block-resources",
        "turndown",
      );
  
      return config;
    },
  }
  
export default nextConfig