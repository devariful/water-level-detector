import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./e2e', timeout:90000,
  use:{baseURL:'http://localhost:5173',launchOptions:{
    ...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),
    args:['--no-sandbox'],
  }},
  webServer:{command:'npm run dev -- --port 5173',url:'http://localhost:5173',reuseExistingServer:!process.env.CI},
});
