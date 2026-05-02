import puppeteer from 'puppeteer-core';

// Configuration
const APP_URL = 'http://localhost:8501';
const OUTPUT_DIR = './images/screenshots';
const CHROME_PATH = '/usr/bin/chromium-browser';
const COLLECTION_NAME = 'demo_screenshots_' + Date.now();

// Screenshot definitions - each captures a specific view
const SCREENS = [
  {
    name: '01-home',
    description: 'Home page with collection manager sidebar',
    beforeScreenshot: async (page) => {
      // Wait for collection manager to load
      await page.waitForSelector('[data-testid="stSidebarContent"]', { timeout: 10000 });
    }
  },
  {
    name: '02-create-collection',
    description: 'Creating a new collection - expanded',
    beforeScreenshot: async (page) => {
      // Expand the "Create New" section using the expander button
      const expanders = await page.$$('button[aria-expanded="false"]');
      for (const expander of expanders) {
        const text = await page.evaluate(el => el.innerText, expander);
        if (text.includes('Create New')) {
          await expander.click();
          break;
        }
      }
      await new Promise(r => setTimeout(r, 500));
      // Wait for the input field
      await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    }
  },
  {
    name: '03-active-collection',
    description: 'After creating collection',
    beforeScreenshot: async (page) => {
      // Find and click the "Create" button using xpath
      try {
        const createButton = await page.$x("//button[contains(text(),'Create')]");
        if (createButton.length > 0) {
          await createButton[0].click();
        }
      } catch (e) {
        console.log('XPath click failed, trying alternative:', e.message);
      }
      await new Promise(r => setTimeout(r, 2000)); // Wait for collection to be created
    }
  },
  {
    name: '04-ask-tab',
    description: 'Ask tab with chat interface',
    beforeScreenshot: async (page) => {
      // Click on Ask tab - find by text content
      const tabs = await page.$$('button[role="tab"]');
      if (tabs.length >= 1) {
        const tabText = await page.evaluate(el => el.innerText, tabs[0]);
        if (tabText.includes('Ask')) {
          await tabs[0].click();
        }
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  },
  {
    name: '05-chat-interface',
    description: 'Chat input visible',
    beforeScreenshot: async (page) => {
      // Wait for the chat input element by its structure
      await page.waitForSelector('div[data-baseweb="input"]', { timeout: 10000 });
    }
  },
  {
    name: '06-history-tab',
    description: 'Q&A History tab',
    beforeScreenshot: async (page) => {
      // Click on History tab
      const tabs = await page.$$('button[role="tab"]');
      if (tabs.length >= 2) {
        const tabText = await page.evaluate(el => el.innerText, tabs[1]);
        if (tabText.includes('History')) {
          await tabs[1].click();
        }
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  },
  {
    name: '07-manage-tab',
    description: 'Manage Documents tab',
    beforeScreenshot: async (page) => {
      // Click on Manage tab
      const tabs = await page.$$('button[role="tab"]');
      if (tabs.length >= 3) {
        const tabText = await page.evaluate(el => el.innerText, tabs[2]);
        if (tabText.includes('Manage')) {
          await tabs[2].click();
        }
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  },
  {
    name: '08-system-prompt-tab',
    description: 'System Prompt tab',
    beforeScreenshot: async (page) => {
      // Click on System Prompt tab
      const tabs = await page.$$('button[role="tab"]');
      if (tabs.length >= 4) {
        const tabText = await page.evaluate(el => el.innerText, tabs[3]);
        if (tabText.includes('System Prompt')) {
          await tabs[3].click();
        }
      }
      await new Promise(r => setTimeout(r, 2000)); // Wait for prompts to load
    }
  },
  {
    name: '09-sidebar',
    description: 'Full sidebar with all settings',
    beforeScreenshot: async (page) => {
      // Scroll sidebar content to bottom to show all items
      await page.evaluate(() => {
        const sidebar = document.querySelector('[data-testid="stSidebarContent"] .block-container');
        if (sidebar) {
          sidebar.scrollTop = sidebar.scrollHeight;
        }
      });
      await new Promise(r => setTimeout(r, 1000));
    }
  },
  {
    name: '10-sidebar-full',
    description: 'Full sidebar with all settings (full page)',
    beforeScreenshot: async (page) => {
      // Ensure sidebar content is visible
      await page.evaluate(() => {
        const sidebar = document.querySelector('[data-testid="stSidebarContent"]');
        if (sidebar) {
          sidebar.scrollTop = 0;
        }
      });
      await new Promise(r => setTimeout(r, 1000));
    }
  }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshots() {
  console.log('Starting Puppeteer screenshot session...');
  console.log(`App URL: ${APP_URL}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Collection name: ${COLLECTION_NAME}`);
  console.log('');

  // Ensure output directory exists
  const fs = await import('fs');
  const path = await import('path');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }

  // Launch browser with system Chrome
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080'
    ]
  });

  const page = await browser.newPage();

  // Set viewport
  await page.setViewport({ width: 1920, height: 1080 });

  // Navigate to app
  console.log(`Navigating to ${APP_URL}...`);
  await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 60000 });

  // Wait for Streamlit to initialize
  await sleep(5000);
  console.log('App loaded.');

  // Take each screenshot
  for (const screen of SCREENS) {
    console.log(`Capturing: ${screen.name} - ${screen.description}`);

    try {
      // Run any pre-screenshot setup
      if (screen.beforeScreenshot) {
        await screen.beforeScreenshot(page);
      }

      // Take screenshot
      const filepath = path.join(OUTPUT_DIR, `${screen.name}.png`);
      await page.screenshot({
        path: filepath,
        fullPage: true,
        type: 'png'
      });

      console.log(`  Saved: ${filepath}`);
    } catch (error) {
      console.error(`  Error capturing ${screen.name}:`, error.message);
    }

    // Brief pause between screenshots
    await sleep(500);
  }

  // Close browser
  await browser.close();
  console.log('');
  console.log('Screenshot session complete!');
  console.log(`Total screenshots: ${SCREENS.length}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

// Run the script
takeScreenshots().catch(console.error);
