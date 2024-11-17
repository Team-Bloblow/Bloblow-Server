const sanitizeHtmlEntity = (string) => {
  return string
    .replaceAll("<b>", "")
    .replaceAll("</b>", "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&quot;", `"`)
    .replaceAll("&#035;", "#")
    .replaceAll("&#039;", `'`)
    .replaceAll("&sim;", "~");
};

module.exports = { sanitizeHtmlEntity };
