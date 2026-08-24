import concurrent.futures
import html
import json
import pathlib
import re
import urllib.request

BASE = "https://lateralthinkingpuzzles.org"
ROOT = pathlib.Path("artifacts")
HEADERS = {"User-Agent": "Mozilla/5.0"}


def fetch(path):
    request = urllib.request.Request(BASE + path, headers=HEADERS)
    return urllib.request.urlopen(request).read().decode()


def decode_rsc(source):
    chunks = []
    pattern = r"<script>self\.__next_f\.push\((.*?)\)</script>"
    for match in re.finditer(pattern, source, re.S):
        value = json.loads(match.group(1))
        if len(value) > 1 and isinstance(value[1], str):
            chunks.append(value[1])
    return "".join(chunks)


def extract_json_object(source, marker):
    start = source.index(marker) + len(marker)
    return json.JSONDecoder().raw_decode(source[start:])[0]


listing = fetch("/zh/puzzle?series=xu-ermu")
matches = re.findall(
    r'\{\\"id\\":\\"\d+\\",\\"slug\\":.*?\\"keyinfoWeights\\":\[[^\]]*\]\}',
    listing
)
metadata = {}
for match in matches:
    item = json.loads(match.replace('\\"', '"'))
    if item.get("series") == "xu-ermu":
        metadata[item["id"]] = item


def load_puzzle(item):
    source = decode_rsc(fetch(f"/zh/puzzle/{item['slug']}"))
    puzzle = extract_json_object(source, '"puzzle":')
    questions = puzzle["investigation"]["questions"]
    puzzle["source_url"] = f"{BASE}/zh/puzzle/{item['slug']}"
    puzzle["bottom_evidence"] = [
        clue["text"]
        for question in questions
        for clue in question["clues"]
    ]
    puzzle["bottom_summary"] = [
        question["answer"]["text"]
        for question in questions
        if question.get("answer")
    ]
    if not puzzle["bottom_summary"]:
        puzzle["bottom_summary"] = puzzle["bottom_evidence"]
    return puzzle


with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
    puzzles = list(executor.map(load_puzzle, sorted(metadata.values(), key=lambda item: int(item["id"]))))

ROOT.mkdir(parents=True, exist_ok=True)
(ROOT / "xu_ermu_public_puzzles.json").write_text(
    json.dumps(puzzles, ensure_ascii=False, indent=2),
    encoding="utf-8"
)

lines = [
    "# 许二木海龟汤公开文字整理",
    "",
    "本文件的汤面来自公开题目页；汤底由页面公开的全部关键线索与分段答案整理，不代表视频卡片的逐字校对稿。",
    ""
]
for index, puzzle in enumerate(puzzles, 1):
    lines.extend([
        f"## {index}. {puzzle['title']}",
        "",
        f"- 来源：[{puzzle['slug']}]({puzzle['source_url']})",
        f"- 分类：{puzzle['category']}",
        f"- 难度：{puzzle['difficulty']}/5",
        "",
        "### 汤面",
        "",
        puzzle["scenario"],
        "",
        "### 汤底",
        "",
        "；".join(puzzle["bottom_summary"]),
        "",
        "### 完整故事线索",
        "",
        "；".join(puzzle["bottom_evidence"]),
        ""
    ])

(ROOT / "许二木海龟汤_公开文本版.md").write_text(
    "\n".join(lines),
    encoding="utf-8"
)

print(len(puzzles))
