import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.dylankral.wrxblecontroller',
  appName: 'WRX RGB Controller',
  webDir: 'dist',
  // No server.url: release and debug builds both use bundled local assets.
  android: { backgroundColor: '#0c1424' },
  plugins: { SystemBars: { insetsHandling: 'css', style: 'DARK' } },
};
export default config;
