import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
import BlockResourcesPlugin from "puppeteer-extra-plugin-block-resources";
import { createCursor } from "ghost-cursor";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const stealth = StealthPlugin();
stealth.enabledEvasions.delete("chrome.runtime");
stealth.enabledEvasions.delete("defaultArgs");
puppeteer.use(stealth);


puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// puppeteer.use(
//   BlockResourcesPlugin({
//     blockedTypes: new Set(["image", "stylesheet", "font"]),
//   })
// );

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function randomDelay(min = 1000, max = 5000) {
  const delay = Math.floor(Math.random() * (max - min) + min);
  await new Promise(resolve => setTimeout(resolve, delay));
  return delay;
}

async function naturalScroll(page, targetPosition, options = {}) {
  const {
    speed = 'medium',
    noise = true,
    stepSize = null
  } = options;

  const currentPosition = await page.evaluate(() => window.scrollY);
  const distance = targetPosition - currentPosition;

  let actualStepSize;
  if (stepSize) {
    actualStepSize = stepSize;
  } else {
    switch (speed) {
      case 'slow': actualStepSize = Math.floor(Math.random() * 50) + 50; break;
      case 'fast': actualStepSize = Math.floor(Math.random() * 100) + 150; break;
      default: actualStepSize = Math.floor(Math.random() * 70) + 100; // medium
    }
  }

  const steps = Math.abs(Math.ceil(distance / actualStepSize));
  const direction = distance > 0 ? 1 : -1;

  for (let i = 1; i <= steps; i++) {
    const noiseAmount = noise ? (Math.random() - 0.5) * actualStepSize * 0.2 : 0;
    const scrollAmount = currentPosition + (direction * actualStepSize * i) + noiseAmount;

    await page.evaluate((position) => {
      window.scrollTo({
        top: position,
        behavior: 'smooth'
      });
    }, scrollAmount);

    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 100) + 50));
  }

  await randomDelay(300, 800);
}

async function humanTyping(page, selector, text) {
  await page.focus(selector);

  for (let i = 0; i < text.length; i++) {
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 200) + 50));

    if (Math.random() < 0.005 && i < text.length - 1) {
      const wrongChar = String.fromCharCode(
        text.charCodeAt(i) + Math.floor(Math.random() * 5) - 2
      );
      await page.keyboard.press(wrongChar);
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 400) + 200));
      await page.keyboard.press('Backspace');
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 300) + 100));
    }

    await page.keyboard.press(text[i]);
  }

  await randomDelay(300, 1200);
}

async function launchBrowser() {
  const commonResolutions = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 }
  ];

  const resolution = commonResolutions[Math.floor(Math.random() * commonResolutions.length)];



  return await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=' + resolution.width + ',' + resolution.height,
      '--lang=en-US,en',
      '--disable-infobars',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: resolution,
    ignoreHTTPSErrors: true,
    ignoreDefaultArgs: ['--enable-automation'],
  });
}

async function connectToBrowser() {

  const commonResolutions = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 }
  ];

  const resolution = commonResolutions[Math.floor(Math.random() * commonResolutions.length)];


  const userDataDir = path.join(os.tmpdir(), 'puppeteer_user_data_dir');

  try {
    await fs.mkdir(userDataDir, { recursive: true });
  } catch (error) {
    console.error('Error creating user data directory:', error);
  }
  return await puppeteer.connect({
    browserURL: "http://localhost:9222",
    defaultViewport: resolution,
    headless: false,
  });
}

async function setupPage(browser) {
  const page = await browser.newPage();


  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
  ];

  const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
  await page.setUserAgent(userAgent);

  await page.setJavaScriptEnabled(true);
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  const cursor = createCursor(page);
  page.cursor = cursor;


  await page.evaluateOnNewDocument(() => {

    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });


    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });


    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        return [1, 2, 3, 4, 5];
      },
    });
  });

  return page;
}

async function loginToLinkedIn(page) {
  console.log("Starting LinkedIn login process...");
  const email = process.env.LINKEDIN_EMAIL;
  const password = process.env.LINKEDIN_PASSWORD;

  if (!email || !password) {
    throw new Error("LinkedIn credentials not found in environment variables");
  }

  try {

    await page.goto('https://www.linkedin.com/feed', {
      timeout: 60000
    });

    const currentUrl = page.url();
    if (currentUrl.includes('linkedin.com/feed')) {
      console.log("Already on LinkedIn feed, skipping login");
      return true;
    }


    const signInOtherAccountSelector = 'a.btn__tertiary--medium[data-cie-control-urn="sign_in_with_another_account"]';
    const signInOtherAccountExists = await page.$(signInOtherAccountSelector) !== null;

    if (signInOtherAccountExists) {
      console.log("Found 'Sign in with another account' option, clicking it...");
      await page.waitForSelector(signInOtherAccountSelector, { visible: true, timeout: 10000 });
      await randomDelay(800, 1500);
      await page.click(signInOtherAccountSelector);
    }

    await page.waitForSelector('#username', { visible: true, timeout: 10000 });
    await page.waitForSelector('#password', { visible: true, timeout: 10000 });

    await randomDelay(1000, 2000);
    await humanTyping(page, '#username', email);
    await randomDelay(800, 1500);
    await humanTyping(page, '#password', password);
    await randomDelay(1000, 2000);

    const loginButtonSelector = 'button[type="submit"]';
    await page.waitForSelector(loginButtonSelector, { visible: true, timeout: 10000 });

    await randomDelay(300, 800);
    await Promise.all([
      page.click(loginButtonSelector),
      page.waitForNavigation({ timeout: 60000 })
    ]);

    console.log("Login successful");
    return true;
  } catch (error) {
    console.error("Login error:", error);
    throw new Error(`LinkedIn login failed: ${error.message}`);
  }
}


async function navigateToProfile(page, url) {

  await randomDelay(1000, 3000);

  const response = await page.goto(url, { timeout: 60000, waitUntil: 'domcontentloaded' });


  await randomDelay(2000, 4000);

  const is404Page = await page.evaluate(() => {
    const errorSection = document.querySelector('section[data-test-not-found-error-container]');
    const errorText = document.querySelector('h2.artdeco-empty-state__headline');
    const hasErrorSection = !!errorSection;
    const hasErrorText = errorText && errorText.textContent.trim().includes("This page doesn't exist");
    return hasErrorSection || hasErrorText;
  });

  if (is404Page || response.status() === 404) {
    throw new Error('PROFILE_NOT_FOUND');
  }
  if (!response.ok()) {
    throw new Error(
      `Failed to load page: ${response.status()} ${response.statusText()}`
    );
  }
}

async function scrapeProfileName(page) {
  try {
    console.log("Scrapping Profile Name...");

    await naturalScroll(page, 100, { speed: 'medium' });

    const nameLocator = page.locator('h1', { visible: true });
    const nameHandle = await nameLocator.waitHandle({ timeout: 10000 });
    const name = await nameHandle.evaluate(el => el.textContent.trim());

    if (!name) throw new Error("Could not find profile name");
    return name;
  } catch (error) {
    throw new Error(`Error scraping name: ${error.message}`);
  }
}

async function scrapeProfileHeadline(page) {
  try {
    console.log("Scrapping Headline");

    await randomDelay(500, 1500);

    const headlineLocator = page.locator('.text-body-medium.break-words', {
      visible: true
    });

    const headlineHandle = await headlineLocator.waitHandle({
      timeout: 10000
    });

    const headline = await headlineHandle.evaluate(el =>
      el.textContent?.trim() || null
    );

    return headline;
  } catch (error) {
    return null;
  }
}

async function scrapeAboutText(page) {
  try {
    console.log("Scrapping About Text...");

    await naturalScroll(page, 300, { speed: 'medium' });
    await randomDelay(1000, 2000);

    const textLocator = page.locator(
      'div.display-flex.ph5.pv3 span[aria-hidden="true"]:first-child',
      {
        visible: true
      }
    );
    const handle = await textLocator.waitHandle({
      timeout: 10000,
    });
    const aboutText = await handle.evaluate(
      el => el.textContent?.trim() || null
    );

    return aboutText;
  } catch (error) {
    console.error('About section error:', error.message);
    return null;
  }
}

async function scrapeExperience(page) {
  try {
    console.log("Scraping experience...");

    await naturalScroll(page, 600, { speed: 'medium' });
    await randomDelay(1000, 2500);

    await page.waitForSelector('div#experience.pv-profile-card__anchor + div + div ul li', { timeout: 10000 });

    const experiences = await page.$$eval('div#experience.pv-profile-card__anchor + div + div ul li', (items) => {
      return items.map(item => {
        const titleElement = item.querySelector('.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]');
        const companyElement = item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
        const dateElement = item.querySelector('.t-14.t-normal.t-black--light .pvs-entity__caption-wrapper[aria-hidden="true"]');
        const locationElement = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]:nth-child(2)');

        return {
          title: titleElement ? titleElement.textContent.trim() : null,
          company: companyElement ? companyElement.textContent.trim() : null,
          date: dateElement ? dateElement.textContent.trim() : null,
          location: locationElement ? locationElement.textContent.trim() : null
        };
      }).filter(exp => exp.title);
    });

    return experiences;
  } catch (err) {
    console.error('Experience scraping error:', err.message);
    return [];
  }
}

async function scrapeEducation(page) {
  try {
    console.log("Scrapping Education...");

    await naturalScroll(page, 900, { speed: 'medium' });
    await randomDelay(800, 2000);

    await page.waitForSelector("#education", { timeout: 10000 });
    const eduUl = await page.$("#education ~ div ul");
    if (!eduUl) return [];
    const eduItems = await eduUl.$$("li.artdeco-list__item");
    const education = [];
    for (const item of eduItems) {
      await randomDelay(200, 700);

      const institution = await item
        .$eval(
          '.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]',
          (el) => el.innerText.trim()
        )
        .catch(() => null);

      const degree = await item
        .$eval('.t-14.t-normal span[aria-hidden="true"]', (el) =>
          el.innerText.trim()
        )
        .catch(() => null);

      const details = await item
        .$eval('.t-14.t-normal.t-black--light span[aria-hidden="true"]', (el) =>
          el.innerText.trim()
        )
        .catch(() => null);
      if (institution) {
        education.push({ institution, degree, details });
      }
    }
    return education;
  } catch (err) {
    return [];
  }
}

async function clickShowAllPostsButton(page) {
  try {
    console.log("Clicking Show all posts button...");

    await naturalScroll(page, 1200, { speed: 'medium' });
    await randomDelay(1000, 2500);
    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('a')).some(a => {
        const span = a.querySelector('span.artdeco-button__text');
        return span && span.textContent.trim() === 'Show all posts';
      });
    }, { timeout: 10000 });


    const buttonHandle = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('a')).find(a => {
        const span = a.querySelector('span.artdeco-button__text');
        return span && span.textContent.trim() === 'Show all posts';
      });
    });

    if (!buttonHandle) {
      console.log("Could not find 'Show all posts' button");
      return false;
    }

    await naturalScroll(page, 1200, { speed: 'medium' });
    await buttonHandle.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await new Promise(resolve => setTimeout(resolve, 1000));


    await buttonHandle.evaluate(el => el.click());
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log("Clicked 'Show all posts' button");
    return true;
  } catch (error) {
    console.error("Error clicking 'Show all posts' button:", error);
    return false;
  }
}


async function scrapeFirstOriginalPost(page) {
  try {
    await page.waitForSelector("div.feed-shared-update-v2", { timeout: 10000 });

    await naturalScroll(page, 200, { speed: 'slow' });
    await randomDelay(1000, 2000);

    const postHandles = await page.$$("div.feed-shared-update-v2");
    for (const post of postHandles) {
      await randomDelay(300, 800);

      const isRepost = await post.evaluate((node) => {
        return Array.from(node.querySelectorAll("span")).some((el) =>
          el.textContent.includes("reposted")
        );
      });

      if (!isRepost) {
        console.log("Scraping post text...");
        const postText = await post.$eval(".update-components-text", (el) =>
          el.innerText.trim()
        );
        console.log("Post text found");
        return { text: postText };
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}


async function generateConnectionMessage(profileData) {
  const prompt = `You are a professional LinkedIn user. Write a short, friendly, and personalized connection request message for the following profile:\n\nName: ${profileData.name
    }\nHeadline: ${profileData.headline}\nAbout: ${profileData.about
    }\nExperience: ${profileData.experience && profileData.experience.length > 0
      ? profileData.experience[0].title +
      " at " +
      profileData.experience[0].company
      : ""
    }\nEducation: ${profileData.education && profileData.education.length > 0
      ? profileData.education[0].institution +
      ", " +
      profileData.education[0].degree
      : ""
    }\n\nKeep it under 300 characters, mention something relevant from their background, and be genuine.`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant for LinkedIn networking.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 150,
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

async function generatePostComment(postText) {
  const prompt = `You are a professional LinkedIn user. Write a thoughtful, positive, and relevant comment for the following post:\n\nPost: ${postText}\n\nKeep it concise, friendly, and specific to the post content.`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant for LinkedIn engagement.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 100,
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

export async function POST(request) {
  let browser;

  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        {
          type: 'validation_error',
          message: "Please enter a LinkedIn profile URL"
        },
        { status: 400 }
      );
    }

    if (!url.includes('linkedin.com/in/')) {
      return NextResponse.json(
        {
          type: 'validation_error',
          message: "Please enter a valid LinkedIn profile URL"
        },
        { status: 400 }
      );
    }


    browser = await launchBrowser();
    const page = await setupPage(browser);

    try {

      await loginToLinkedIn(page);


      await randomDelay(2000, 5000);


      await navigateToProfile(page, url);


      const scrapeOrder = Math.random() > 0.5;

      const name = await scrapeProfileName(page);
      await randomDelay(800, 1500);

      const headline = await scrapeProfileHeadline(page);
      await randomDelay(700, 1800);

      if (scrapeOrder) {
        var about = await scrapeAboutText(page);
        await randomDelay(1000, 2000);
        var experience = await scrapeExperience(page);
      } else {
        var experience = await scrapeExperience(page);
        await randomDelay(1000, 2000);
        var about = await scrapeAboutText(page);
      }

      await randomDelay(800, 1800);
      const education = await scrapeEducation(page);

      let post = null;
      const postsButtonClicked = await clickShowAllPostsButton(page);
      if (postsButtonClicked) {
        await randomDelay(2000, 4000);
        post = await scrapeFirstOriginalPost(page);
      }

      let connectionMessage = null;
      let postComment = null;
      try {
        connectionMessage = await generateConnectionMessage({
          name,
          headline,
          about,
          experience,
          education,
        });
      } catch (e) {
        connectionMessage = null;
      }

      try {
        if (post && post.text) {
          postComment = await generatePostComment(post.text);
        }
      } catch (e) {
        postComment = null;
      }

      return NextResponse.json({
        connectionMessage,
        postComment,
      });
    } catch (scrapingError) {
      console.error("Error during scraping:", scrapingError);

      if (scrapingError.message === 'PROFILE_NOT_FOUND') {
        return NextResponse.json(
          {
            type: 'not_found_error',
            message: "The LinkedIn profile you're looking for doesn't exist. Please verify the URL and try again."
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          type: 'scraping_error',
          message: "Failed to load profile data. Please check the URL and try again."
        },
        { status: 500 }
      );
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error("Error closing browser:", closeError);
        }
      }
    }
  } catch (error) {

    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("Error closing browser:", closeError);
      }
    }
    return NextResponse.json(
      {
        type: 'system_error',
        message: "An unexpected error occurred. Please try again later."
      },
      { status: 500 }
    );
  }
}