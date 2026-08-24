import json
import pathlib
import re
import urllib.request

ROOT = pathlib.Path("artifacts")
HEADERS = {"User-Agent": "Mozilla/5.0"}
LIST_URL = "https://api.bilibili.com/x/article/list/web/articles?id=999117&pn=1&ps=30&sort=0"


def fetch(url):
    request = urllib.request.Request(url, headers=HEADERS)
    return urllib.request.urlopen(request).read().decode()


listing = json.loads(fetch(LIST_URL))["data"]
articles = []

for article in listing["articles"]:
    url = f"https://www.bilibili.com/opus/{article['dyn_id_str']}"
    source = fetch(url)
    match = re.search(r"window\.__INITIAL_STATE__=(.*?);\(function", source, re.S)
    state = json.loads(match.group(1))
    content = next(
        module["module_content"]
        for module in state["detail"]["modules"]
        if module.get("module_content")
    )
    paragraphs = []
    for paragraph in content["paragraphs"]:
        node_text = []
        text = paragraph.get("text")
        if text:
            for node in text.get("nodes", []):
                word = node.get("word")
                if word:
                    node_text.append(word.get("words", ""))
        if node_text:
            paragraphs.append("".join(node_text))
    articles.append({
        "id": article["id"],
        "dynamic_id": article["dyn_id_str"],
        "title": article["title"],
        "url": url,
        "paragraphs": paragraphs
    })

(ROOT / "bilibili_text_collection.json").write_text(
    json.dumps(articles, ensure_ascii=False, indent=2),
    encoding="utf-8"
)

lines = [
    "# 许二木海龟汤 B 站文字文集",
    "",
    f"文集共 {len(articles)} 篇，以下为页面正文逐段提取。",
    ""
]
for article in articles:
    lines.extend([
        f"## {article['title']}",
        "",
        f"- 来源：{article['url']}",
        "",
        *article["paragraphs"],
        ""
    ])

(ROOT / "许二木海龟汤_B站文字文集.md").write_text(
    "\n\n".join(lines),
    encoding="utf-8"
)

print(len(articles), sum(len(article["paragraphs"]) for article in articles))
