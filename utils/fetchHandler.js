const fetchHandler = async ({ url, method = "GET" }) => {
  const options = {
    method,
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    console.error(response.status);
  }

  return await response.json();
};

export default fetchHandler;
