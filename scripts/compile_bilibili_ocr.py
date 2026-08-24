import difflib
import json
import pathlib
import re

ROOT = pathlib.Path("artifacts")


def load_frames(path):
    source = path.read_text(encoding="utf-8")
    frames = []
    for block in re.split(r"(?=^FILE\t)", source, flags=re.M):
        lines = block.strip().splitlines()
        if not lines or not lines[0].startswith("FILE\t"):
            continue
        image = pathlib.Path(lines[0].split("\t", 1)[1])
        text = "\n".join(lines[1:]).strip()
        frames.append({"image": image, "text": text})
    return frames


def normalized(text):
    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
        and "仅为" not in line
        and "无真实依据" not in line
        and "无眞实依据" not in line
        and "bilibili" not in line.lower()
        and "是许木木" not in line
        and "许二木本人" not in line
    ]
    return re.sub(r"\s+", "", "\n".join(lines))


def candidates(frames):
    selected = []
    for frame in frames:
        text = normalized(frame["text"])
        if (
            "汤面" not in text
            and "汤底" not in text
            and "上帝视角" not in text
            and "句子解析" not in text
            and "真理之门" not in text
            and not ("《" in text and len(text) >= 120)
            and not (re.search(r"\d+/\d+", text) and len(text) >= 180)
        ):
            continue
        if selected:
            previous = normalized(selected[-1]["text"])
            ratio = difflib.SequenceMatcher(None, previous, text).ratio()
            if ratio >= 0.72:
                if len(text) > len(previous):
                    selected[-1] = frame
                continue
        selected.append(frame)
    return selected


inventory = json.loads((ROOT / "bilibili_collection.json").read_text(encoding="utf-8"))
pages = {page["page"]: page for page in inventory["pages"]}
tail_frames = load_frames(ROOT / "bilibili_tail_ocr.txt")
compilation_frames = load_frames(ROOT / "bilibili_compilation_ocr.txt")

groups = {}
for frame in tail_frames + compilation_frames:
    relative = frame["image"].relative_to(ROOT)
    key = relative.parts[1]
    groups.setdefault(key, []).append(frame)

lines = [
    "# 许二木海龟汤视频卡片 OCR 校对底稿",
    "",
    "识别范围：B 站《许二木海龟汤全收录》122 个分 P 的末尾 35 秒，以及合辑内部章节结束前 25 秒。",
    "",
    "说明：这是机器 OCR 文本，已按连续重复画面去重。每段保留对应截图路径，疑似错字应以截图为准。",
    ""
]

for key in sorted(groups):
    part = int(key[:3])
    page = pages[part]
    title = page["part"].replace("S1E35", "S3E35") if part == 87 else page["part"]
    found = candidates(sorted(groups[key], key=lambda frame: frame["image"].name))
    if not found:
        continue
    lines.extend([
        f"## P{part:03d} {title}",
        "",
        f"- 视频：https://www.bilibili.com/video/{inventory['bvid']}?p={part}",
        ""
    ])
    for index, frame in enumerate(found, 1):
        relative = frame["image"].relative_to(ROOT)
        lines.extend([
            f"### 卡片 {index}",
            "",
            f"- 截图：[{relative.as_posix()}]({relative.as_posix()})",
            "",
            frame["text"],
            ""
        ])

(ROOT / "许二木海龟汤_视频卡片OCR.md").write_text(
    "\n".join(lines),
    encoding="utf-8"
)

index_lines = [
    "# 许二木海龟汤视频索引",
    "",
    f"- 合集：{inventory['title']}",
    f"- UP：{inventory['owner']['name']}",
    f"- BV：{inventory['bvid']}",
    f"- 分 P：{len(inventory['pages'])}",
    ""
]
for page in inventory["pages"]:
    title = page["part"].replace("S1E35", "S3E35") if page["page"] == 87 else page["part"]
    index_lines.append(
        f"- P{page['page']:03d} | {page['duration']} 秒 | {title} | "
        f"https://www.bilibili.com/video/{inventory['bvid']}?p={page['page']}"
    )

(ROOT / "许二木海龟汤_视频索引.md").write_text(
    "\n".join(index_lines),
    encoding="utf-8"
)
