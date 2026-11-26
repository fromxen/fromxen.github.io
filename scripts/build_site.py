from pathlib import Path
from urllib.parse import unquote, quote
from PIL import Image, ImageOps, ImageCms
from bs4 import BeautifulSoup
import io, shutil

root = Path.cwd()
out = root / "_site"
out.mkdir(exist_ok=True)
for p in root.iterdir():
    if p.is_file() and p.suffix.lower() in {".html", ".css", ".js", ".png", ".ico", ".svg", ".txt"}:
        shutil.copy2(p, out / p.name)
cache = {}
def variants(src):
    p = root / unquote(src)
    if p in cache:
        return cache[p]
    with Image.open(p) as original:
        im = ImageOps.exif_transpose(original)
        icc = im.info.get("icc_profile")
        if icc:
            im = ImageCms.profileToProfile(im, ImageCms.ImageCmsProfile(io.BytesIO(icc)), ImageCms.createProfile("sRGB"), outputMode="RGB")
        else:
            im = im.convert("RGB")
        w,h = im.size
        entries = []
        for width in sorted(set(min(w, n) for n in (480, 800, 1200, 1600, 2400))):
            resized = im.resize((width, max(1, round(h*width/w))), Image.Resampling.LANCZOS)
            dest = Path("optimized") / p.relative_to(root).parent / (p.name + f"-{width}.webp")
            (out / dest).parent.mkdir(parents=True, exist_ok=True)
            resized.save(out / dest, "WEBP", quality=88, method=6)
            entries.append((quote(dest.as_posix()),width))
        cache[p] = (w,h,entries)
        return cache[p]

for page in out.glob("*.html"):
    soup = BeautifulSoup(page.read_text(encoding="utf-8"),"html.parser")
    for img in soup.find_all("img",src=True):
        src = img["src"]
        if not src.startswith("photos/"):
            continue
        w,h,entries = variants(src)
        img["width"],img["height"] = str(w),str(h)
        img["src"] = entries[-1][0]
        img["srcset"] = ", ".join(f"{url} {width}w" for url,width in entries)
        if img.find_parent(class_="featured-image"):
            img["sizes"] = "(max-width: 640px) calc(100vw - 40px), (max-width: 830px) 45vw, 740px"
        elif img.find_parent(class_="album-image"):
            img["sizes"] = "(max-width: 640px) calc(100vw - 40px), (max-width: 830px) 45vw, 390px"
        elif "portrait" in img.get("class",[]):
            img["sizes"] = "(max-width: 440px) calc(100vw - 40px), 400px"
        else:
            img["sizes"] = "(max-width: 640px) calc(100vw - 40px), (max-width: 1220px) 47vw, 570px"
        img["decoding"] = "async"
    for meta in soup.find_all("meta",content=True):
        if meta.get("property") != "og:image" and meta.get("name") != "twitter:image":
            continue
        prefix = "https://fromxen.github.io/"
        src = meta["content"].removeprefix(prefix)
        if not src.startswith("photos/"):
            continue
        dest = out / unquote(src)
        if not dest.exists():
            with Image.open(root / unquote(src)) as original:
                im = ImageOps.exif_transpose(original)
                icc = im.info.get("icc_profile")
                if icc:
                    im = ImageCms.profileToProfile(im, ImageCms.ImageCmsProfile(io.BytesIO(icc)), ImageCms.createProfile("sRGB"), outputMode="RGB")
                else:
                    im = im.convert("RGB")
                im.thumbnail((1200,1200), Image.Resampling.LANCZOS)
                dest.parent.mkdir(parents=True,exist_ok=True)
                im.save(dest,"JPEG",quality=90,optimize=True)
    page.write_text(str(soup),encoding="utf-8")
(out / ".nojekyll").touch()
print("Generated", len(cache), "responsive photo sets")
