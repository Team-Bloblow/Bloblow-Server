const { isToday } = require("../utils/date");
const { POST_COUNT, NAVER_BLOG_HOST_NAME } = require("../config/constants");
const postController = require("../controllers/postController");
const { sanitizeHtmlEntity } = require("../utils/sanitizeHtmlEntity");
const { default: fetchHandler } = require("../utils/fetchHandler");

require("dotenv").config();

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const PUPPETEER_SERVER_URL = process.env.PUPPETEER_SERVER_URL;

const getPostCrawlingData = async (post) => {
  try {
    const fetchInfo = {
      url: `${PUPPETEER_SERVER_URL}/crawl/posts/${post.link}`,
      method: "GET",
    };

    const response = await fetchHandler(fetchInfo);
    const { content, likeCount, commentCount, isAd } = response;

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
    console.error(err);
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
    const apiURL = `https://openapi.naver.com/v1/search/blog?query="${encodeURI(keyword)}"&sort=date&start=${startIndex}&display=${POST_COUNT}`;
    const response = await fetch(apiURL, {
      method: "get",
      headers: {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
      },
    });

    const data = await response.json();
    if (!data?.items || data.items.length === 0) {
      break;
    }

    const dataList = data.items.filter(
      (item) => item.link.includes(NAVER_BLOG_HOST_NAME) && isToday(item.postdate)
    );

    console.log(dataList);

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
