import concurrent.futures
import json
import pathlib
import subprocess
import urllib.parse
import urllib.request

BVID = "BV1dPxazcEZD"
ROOT = pathlib.Path("artifacts")
FRAMES = ROOT / "video_tail_frames"
HEADERS = {"User-Agent": "Mozilla/5.0"}


def request_json(url):
    request = urllib.request.Request(url, headers=HEADERS)
    return json.loads(urllib.request.urlopen(request).read())


def extract(page):
    number = page["page"]
    target = FRAMES / f"{number:03d}"
    target.mkdir(parents=True, exist_ok=True)
    if len(list(target.glob("*.jpg"))) >= 25:
        return number
    query = urllib.parse.urlencode({
        "bvid": BVID,
        "cid": page["cid"],
        "qn": 64,
        "fnval": 0,
        "fourk": 0
    })
    stream = request_json(f"https://api.bilibili.com/x/player/playurl?{query}")["data"]["durl"][0]["backup_url"][0]
    start = max(0, page["duration"] - 35)
    subprocess.run([
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-headers",
        f"Referer: https://www.bilibili.com/video/{BVID}?p={number}\r\nUser-Agent: Mozilla/5.0\r\n",
        "-ss",
        str(start),
        "-i",
        stream,
        "-t",
        "35",
        "-vf",
        "fps=1",
        "-q:v",
        "3",
        "-y",
        str(target / "%02d.jpg")
    ], check=True)
    return number


FRAMES.mkdir(parents=True, exist_ok=True)
view = request_json(f"https://api.bilibili.com/x/web-interface/view?bvid={BVID}")["data"]
(ROOT / "bilibili_collection.json").write_text(
    json.dumps({
        "bvid": BVID,
        "title": view["title"],
        "owner": view["owner"],
        "pages": view["pages"]
    }, ensure_ascii=False, indent=2),
    encoding="utf-8"
)

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
    for number in executor.map(extract, view["pages"]):
        print(number, flush=True)
