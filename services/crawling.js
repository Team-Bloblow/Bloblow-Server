const { isToday } = require("../utils/date");
const { POST_COUNT, NAVER_BLOG_HOST_NAME } = require("../config/constants");
const postController = require("../controllers/postController");
const { sanitizeHtmlEntity } = require("../utils/sanitizeHtmlEntity");
const { fetchHandler } = require("../utils/fetchHandler");

require("dotenv").config();

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const PUPPETEER_SERVER_URL = process.env.PUPPETEER_SERVER_URL;

const getPostCrawlingData = async (post) => {
  try {
    console.log("start crawling");
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();

    await page.setViewport({ width: 1080, height: 1024 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
    );
    await page.goto(post.link);
    await page.waitForSelector("iframe");

    const iframeURL = await page.evaluate(() => document.querySelector("iframe").src);

    await page.goto(iframeURL);
    await page.waitForNetworkIdle();

    const content = await page.evaluate(() =>
      JSON.stringify(document.querySelector(".se-main-container").textContent)
    );
    const commentCount = await page.evaluate(
      () => parseInt(document.querySelector("._commentCount").innerText.trim()) || 0
    );
    const likeCount = await page.evaluate(
      () => parseInt(document.querySelector(".u_cnt._count").innerText.trim()) || 0
    );
    const isAd = await Promise.resolve(
      validateAdKeyword.some((adKeyword) => content.includes(adKeyword))
    );

    await browser.close();

    return {
      title: sanitizeHtmlEntity(post.title),
      link: post.link,
      description: sanitizeHtmlEntity(post.description),
      content,
      likeCount,
      commentCount,
      isAd,
    };
  } catch (err) {
    console.err(err);
  }
};

const promiseAllSettled = async (list) => {
  const mappedPromises = list.map((data) => {
    return Promise.resolve(getPostCrawlingData(data))
      .then((value) => {
        return {
          status: "fulfilled",
          value,
        };
      })
      .catch((reason) => {
        return {
          status: "rejected",
          reason,
        };
      });
  });

  return Promise.all(mappedPromises);
};

const getKeywordPostList = async (keyword, keywordId) => {
  let startIndex = 1;

  while (true) {
    try {
      const apiURL = `https://openapi.naver.com/v1/search/blog?query="${encodeURI(keyword)}"&sort=date&start=${startIndex}&display=${POST_COUNT}`;
      const response = await fetch(apiURL, {
        method: "get",
        headers: {
          "X-Naver-Client-Id": NAVER_CLIENT_ID,
          "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
        },
      });

      const data = await response.json();
      if (data?.items.length === 0 || isToday(data?.items[0]?.postdate) === false) {
        break;
      }

    const dataList = data.items.filter(
      (item) => item.link.includes(NAVER_BLOG_HOST_NAME) && isToday(item.postdate)
    );

      const postList = Promise.allSettled
        ? await Promise.allSettled(dataList.map((data) => getPostCrawlingData(data)))
        : await promiseAllSettled(dataList);

      for await (const post of postList) {
        if (post.status === "fulfilled") {
          postController.upsert({ keywordId, ...post.value });
        }
      }

      const postDateOfLastPost = data.items[data.items?.length - 1]?.postdate;
      if (!isToday(postDateOfLastPost)) {
        break;
      }

      startIndex += POST_COUNT;
    } catch (error) {
      console.error(error);
      break;
    }
  }
};

module.exports = { getKeywordPostList };
