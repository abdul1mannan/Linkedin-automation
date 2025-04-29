import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
import BlockResourcesPlugin from "puppeteer-extra-plugin-block-resources";
import { createCursor } from "ghost-cursor";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const stealth = StealthPlugin();
stealth.enabledEvasions.delete("chrome.runtime");
stealth.enabledEvasions.delete("defaultArgs");
puppeteer.use(stealth);


puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
puppeteer.use(
  BlockResourcesPlugin({
    blockedTypes: new Set(["image", "stylesheet", "font"]),
  })
);

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

async function connectToBrowser() {

  const commonResolutions = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 }
  ];

 
  const resolution = commonResolutions[Math.floor(Math.random() * commonResolutions.length)];

  return await puppeteer.connect({
    browserURL: "http://localhost:9222",
    defaultViewport: resolution,
    headless: false,
  });
}

async function setupPage(browser) {
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(true);
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  
  const cursor = createCursor(page);
  page.cursor = cursor;

  return page;
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

    const button = await page.waitForSelector('footer a span.artdeco-button__text', {
      visible: true,
      timeout: 15000,
      text: 'Show all posts'
    });

    if (!button) {
      throw new Error("'Show all posts' button not found");
    }

    await page.cursor.move('footer a span.artdeco-button__text');
    await randomDelay(500, 1200);

    await page.click('footer a span.artdeco-button__text');

    await randomDelay(3000, 5000);

    return true;
  } catch (error) {
    if (error.message.includes("'Show all posts' button not found")) {
      console.log("'Show all posts' button not found");
      return false;
    }
    console.error("Error clicking button:", error.message);
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

    browser = await connectToBrowser();
    const page = await setupPage(browser);

    try {
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
        name,
        headline: headline || "No headline available",
        about: about || null,
        experience: experience || null,
        education: education || null,
        post: post ? post.text : null,
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
          // await browser.close();
        } catch (closeError) {
          console.error("Error closing browser:", closeError);
        }
      }
    }
  } catch (error) {
    return NextResponse.json(
      {
        type: 'system_error',
        message: "An unexpected error occurred. Please try again later."
      },
      { status: 500 }
    );
  }
}
