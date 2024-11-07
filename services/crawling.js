const puppeteer = require("puppeteer");
const { isToday } = require("../utils/date");
const { POST_COUNT, NAVER_BLOG_HOST_NAME } = require("../config/constants");
const postController = require("../controllers/postController");

require("dotenv").config();

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

const getPostCrawlingData = async (post) => {
  const browser = await puppeteer.launch({
    headless: true,
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

  return {
    title: post.title,
    link: post.link,
    description: post.description,
    content,
    likeCount,
    commentCount,
  };
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
    const apiURL = `https://openapi.naver.com/v1/search/blog?query="${encodeURI(keyword)}"&sort=date&start=${startIndex}&display=${POST_COUNT}`;
    const response = await fetch(apiURL, {
      method: "get",
      headers: {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
      },
    });

    const data = await response.json();
    if (!data?.items) {
      break;
    }

    const dataList = data.items.filter(
      (item) => item.link.includes(NAVER_BLOG_HOST_NAME) && isToday(item.postdate)
    );

    const postList = Promise.allSettled
      ? await Promise.allSettled(
          dataList.map(async (data) => {
            const result = await getPostCrawlingData(data);
            return result;
          })
        )
      : await promiseAllSettled(dataList);

    for await (const post of postList) {
      if (post.status === "fulfilled") {
        postController.upsert({ keywordId, ...post.value });
      }
    }

    const postDateOfLastPost = data.items[data.items?.length - 1].postdate;
    if (isToday(postDateOfLastPost)) {
      startIndex += POST_COUNT;
    } else {
      break;
    }
  }
};

module.exports = { getKeywordPostList };
