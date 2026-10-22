import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, TiffImagePlugin

from app.services.image_checks import find_hash_reuse, inspect_image


class Cursor:
    def __init__(self, values):
        self.values = values

    async def to_list(self, length):
        return self.values[:length]


class Collection:
    def __init__(self, values):
        self.values = values

    def find(self, query, projection=None):
        if "phash" in query:
            return Cursor(self.values)
        ids = set(query.get("_id", {}).get("$in", []))
        return Cursor([row for row in self.values if row.get("_id") in ids])


def run_immediate(coroutine):
    """Run coroutines whose fake collection awaits complete without event-loop I/O."""
    try:
        coroutine.send(None)
    except StopIteration as result:
        return result.value
    raise AssertionError("test coroutine unexpectedly performed asynchronous I/O")


class ImageChecksTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.path = Path(self.tempdir.name) / "fixture.jpg"

    def save_image(self, exif=None, color=(40, 80, 120)):
        image = Image.new("RGB", (24, 24), color)
        options = {"exif": exif} if exif else {}
        image.save(self.path, **options)
        return str(self.path)

    def test_no_exif_flag(self):
        result = inspect_image(self.save_image(), 37.0, -122.0)
        self.assertIn("no_exif", result["flags"])

    def test_stale_photo_flag(self):
        exif = Image.Exif()
        exif[36867] = "2020:01:01 12:00:00"
        result = inspect_image(
            self.save_image(exif), 37.0, -122.0,
            now=datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        self.assertIn("stale_photo", result["flags"])

    def test_location_mismatch_flag(self):
        gps = {
            1: "N", 2: tuple(TiffImagePlugin.IFDRational(n, 1) for n in (40, 0, 0)),
            3: "W", 4: tuple(TiffImagePlugin.IFDRational(n, 1) for n in (74, 0, 0)),
        }
        exif = Image.Exif()
        exif[34853] = gps
        result = inspect_image(self.save_image(exif), 37.0, -122.0)
        self.assertIn("location_mismatch", result["flags"])

    def test_same_user_hash_gets_duplicate_photo_flag(self):
        phash = inspect_image(self.save_image(), 37.0, -122.0)["phash"]
        flags = run_immediate(find_hash_reuse(
            phash, "citizen-a",
            Collection([{"_id": "report-a", "citizen_id": "citizen-a"}]),
            Collection([{"report_id": "report-a", "phash": phash}]),
        ))
        self.assertIn("duplicate_photo", flags)

    def test_different_user_hash_gets_reused_image_flag(self):
        phash = inspect_image(self.save_image(), 37.0, -122.0)["phash"]
        flags = run_immediate(find_hash_reuse(
            phash, "citizen-b",
            Collection([{"_id": "report-a", "citizen_id": "citizen-a"}]),
            Collection([{"report_id": "report-a", "phash": phash}]),
        ))
        self.assertIn("reused_image", flags)


if __name__ == "__main__":
    unittest.main()
