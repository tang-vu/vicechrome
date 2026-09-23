import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

export function launchChrome() {
  const paths = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'];
  const executablePath = paths.find(path => path && existsSync(path));
  return chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
}
