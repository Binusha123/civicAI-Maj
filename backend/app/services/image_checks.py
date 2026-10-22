"""Non-decisive image metadata and perceptual-hash signals for human review."""

import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import imagehash
from PIL import ExifTags, Image


def _ratio(value: Any) -> float:
    return float(value.numerator) / float(value.denominator) if hasattr(value, "numerator") else float(value)


def _coordinate(values: Any, ref: str) -> float:
    degrees, minutes, seconds = (_ratio(part) for part in values)
    result = degrees + minutes / 60 + seconds / 3600
    return -result if str(ref).upper() in {"S", "W"} else result


def _exif_gps(exif: Any) -> Optional[Tuple[float, float]]:
    try:
        raw_gps = exif.get_ifd(34853)
    except (AttributeError, KeyError, TypeError):
        raw_gps = exif.get(34853)
    if not raw_gps:
        return None
    if not hasattr(raw_gps, "items"):
        return None
    gps = {ExifTags.GPSTAGS.get(key, key): value for key, value in raw_gps.items()}
    if not all(key in gps for key in ("GPSLatitude", "GPSLatitudeRef", "GPSLongitude", "GPSLongitudeRef")):
        return None
    return (
        _coordinate(gps["GPSLatitude"], gps["GPSLatitudeRef"]),
        _coordinate(gps["GPSLongitude"], gps["GPSLongitudeRef"]),
    )


def _parse_capture_time(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, bytes):
        value = value.decode("ascii", errors="ignore")
    try:
        parsed = datetime.strptime(str(value), "%Y:%m:%d %H:%M:%S")
        return parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _distance_metres(a_lat: float, a_lon: float, b_lat: float, b_lon: float) -> float:
    radius = 6_371_000
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp, dl = math.radians(b_lat - a_lat), math.radians(b_lon - a_lon)
    value = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(value))


def inspect_image(image_path: str, latitude: float, longitude: float, now: Optional[datetime] = None) -> Dict[str, Any]:
    """Read weak EXIF signals and compute a pHash; none of these prove fraud."""
    flags = []
    capture_time = None
    gps = None
    with Image.open(image_path) as image:
        exif = image.getexif()
        if not exif:
            flags.append("no_exif")
        else:
            capture_time = _parse_capture_time(exif.get(36867) or exif.get(306))
            try:
                gps = _exif_gps(exif)
            except (TypeError, ValueError, ZeroDivisionError):
                gps = None

        phash = str(imagehash.phash(image))

    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    if capture_time and capture_time < current - timedelta(days=7):
        flags.append("stale_photo")
    if gps and _distance_metres(latitude, longitude, gps[0], gps[1]) > 500:
        flags.append("location_mismatch")

    return {
        "flags": flags,
        "capture_time": capture_time.isoformat() if capture_time else None,
        "gps": {"latitude": gps[0], "longitude": gps[1]} if gps else None,
        "phash": phash,
    }


async def find_hash_reuse(phash: str, citizen_id: str, reports_collection: Any, analyses_collection: Any, max_distance: int = 5) -> list[str]:
    """Compare this upload with saved hashes and return user-reuse signal flags."""
    if not phash:
        return []
    analyses = await analyses_collection.find({"phash": {"$exists": True}}).to_list(length=10000)
    report_ids = [item.get("report_id") for item in analyses if item.get("report_id")]
    if not report_ids:
        return []
    reports = await reports_collection.find({"_id": {"$in": report_ids}}, {"_id": 1, "citizen_id": 1}).to_list(length=len(report_ids))
    report_by_id = {item["_id"]: item for item in reports}
    signals = set()
    target_hash = imagehash.hex_to_hash(phash)
    for item in analyses:
        report = report_by_id.get(item.get("report_id"))
        previous_hash = item.get("phash")
        if not report or not previous_hash:
            continue
        try:
            distance = target_hash - imagehash.hex_to_hash(previous_hash)
        except (TypeError, ValueError):
            continue
        if distance <= max_distance:
            signals.add("duplicate_photo" if report.get("citizen_id") == citizen_id else "reused_image")
    return sorted(signals)
