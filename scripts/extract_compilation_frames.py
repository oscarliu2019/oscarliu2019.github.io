import json
import pathlib
import subprocess
import urllib.parse
import urllib.request

BVID = "BV1dPxazcEZD"
ROOT = pathlib.Path("artifacts/video_compilation_frames")
HEADERS = {"User-Agent": "Mozilla/5.0"}
BOUNDARIES = {
    48: [241, 492, 847, 967, 1148, 1338],
    56: [441, 667, 1224, 1306],
    64: [696, 914, 1228, 1415, 1625],
    73: [753, 993, 1116],
    85: [979, 1191, 1510],
    98: [802, 1165, 1400],
    103: [451, 790]
}


def request_json(url):
    request = urllib.request.Request(url, headers=HEADERS)
    return json.loads(urllib.request.urlopen(request).read())


view = request_json(f"https://api.bilibili.com/x/web-interface/view?bvid={BVID}")["data"]
pages = {page["page"]: page for page in view["pages"]}
ROOT.mkdir(parents=True, exist_ok=True)

for number, boundaries in BOUNDARIES.items():
    page = pages[number]
    query = urllib.parse.urlencode({
        "bvid": BVID,
        "cid": page["cid"],
        "qn": 64,
        "fnval": 0,
        "fourk": 0
    })
    stream = request_json(f"https://api.bilibili.com/x/player/playurl?{query}")["data"]["durl"][0]["backup_url"][0]
    for index, boundary in enumerate(boundaries, 1):
        target = ROOT / f"{number:03d}_{index:02d}"
        target.mkdir(parents=True, exist_ok=True)
        subprocess.run([
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-headers",
            f"Referer: https://www.bilibili.com/video/{BVID}?p={number}\r\nUser-Agent: Mozilla/5.0\r\n",
            "-ss",
            str(boundary - 25),
            "-i",
            stream,
            "-t",
            "25",
            "-vf",
            "fps=1",
            "-q:v",
            "3",
            "-y",
            str(target / "%02d.jpg")
        ], check=True)
        print(number, index, flush=True)

for number in [32, 38]:
    page = pages[number]
    query = urllib.parse.urlencode({
        "bvid": BVID,
        "cid": page["cid"],
        "qn": 64,
        "fnval": 0,
        "fourk": 0
    })
    stream = request_json(f"https://api.bilibili.com/x/player/playurl?{query}")["data"]["durl"][0]["backup_url"][0]
    target = ROOT / f"{number:03d}_full"
    target.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-headers",
        f"Referer: https://www.bilibili.com/video/{BVID}?p={number}\r\nUser-Agent: Mozilla/5.0\r\n",
        "-i",
        stream,
        "-vf",
        "fps=1",
        "-q:v",
        "3",
        "-y",
        str(target / "%04d.jpg")
    ], check=True)
    print(number, "full", flush=True)
