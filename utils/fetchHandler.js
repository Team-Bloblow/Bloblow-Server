const fetchHandler = async ({ url, method = "GET", params }) => {
  const queryString = new URLSearchParams(params).toString();
  const fullUrl = queryString ? `${url}?${queryString}` : `${url}`;

  const options = {
    method,
  };

  const response = await fetch(fullUrl, options);

  if (!response.ok) {
    console.error(response.status);
  }

  return await response.json();
};

export default fetchHandler;
