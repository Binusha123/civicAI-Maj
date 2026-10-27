import asyncio
import csv
import sys
import time
from collections import Counter
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.services.ai_service import ai_service  # noqa: E402


FOLDER_CATEGORIES = {
    "road": "Road Damage",
    "garbage": "Garbage & Sanitation",
    "water": "Water Issues",
    "electricity": "Electricity Hazards",
    "other": "None",
}
LABELS = list(FOLDER_CATEGORIES.values())
RESULTS_PATH = BACKEND_DIR / "eval_results.csv"


async def evaluate():
    confusion = Counter()
    category_totals = Counter()
    category_correct = Counter()
    durations = []
    total = 0
    correct = 0
    unavailable = 0

    for folder, actual_category in FOLDER_CATEGORIES.items():
        image_paths = sorted((BACKEND_DIR / "eval_data" / folder).glob("*.jpg"))
        for image_path in image_paths:
            started = time.perf_counter()
            result = await ai_service.analyze_image(str(image_path), actual_category)
            durations.append(time.perf_counter() - started)
            if "ai_unavailable" in result["flags"]:
                unavailable += 1
                print(f"Skipped {image_path.name}: AI fallback was used")
                continue

            predicted_category = result["detected_category"]
            confusion[(actual_category, predicted_category)] += 1
            category_totals[actual_category] += 1
            total += 1
            if predicted_category == actual_category:
                category_correct[actual_category] += 1
                correct += 1

    average_seconds = sum(durations) / len(durations) if durations else 0.0
    overall_accuracy = correct / total if total else 0.0

    print("Confusion matrix (rows = actual, columns = predicted)")
    print("Actual category".ljust(25) + " ".join(label[:10].rjust(12) for label in LABELS))
    for actual_category in LABELS:
        row = actual_category.ljust(25)
        row += " ".join(
            str(confusion[(actual_category, predicted_category)]).rjust(12)
            for predicted_category in LABELS
        )
        print(row)

    print("\nPer-category accuracy")
    for category in LABELS:
        category_total = category_totals[category]
        accuracy = category_correct[category] / category_total if category_total else 0.0
        print(f"{category}: {accuracy:.1%} ({category_correct[category]}/{category_total})")
    print(f"Overall accuracy: {overall_accuracy:.1%} ({correct}/{total})")
    print(f"Average seconds per image: {average_seconds:.2f}")
    print(f"Images skipped because AI was unavailable: {unavailable}")

    with RESULTS_PATH.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=[
                "section",
                "actual_category",
                "predicted_category",
                "count",
                "correct",
                "total",
                "accuracy",
                "average_seconds",
            ],
        )
        writer.writeheader()
        for actual_category in LABELS:
            for predicted_category in LABELS:
                writer.writerow(
                    {
                        "section": "confusion_matrix",
                        "actual_category": actual_category,
                        "predicted_category": predicted_category,
                        "count": confusion[(actual_category, predicted_category)],
                    }
                )
        for category in LABELS:
            category_total = category_totals[category]
            category_hits = category_correct[category]
            writer.writerow(
                {
                    "section": "category_accuracy",
                    "actual_category": category,
                    "correct": category_hits,
                    "total": category_total,
                    "accuracy": category_hits / category_total if category_total else 0.0,
                }
            )
        writer.writerow(
            {
                "section": "overall",
                "correct": correct,
                "total": total,
                "accuracy": overall_accuracy,
                "average_seconds": average_seconds,
            }
        )
        writer.writerow({"section": "ai_unavailable", "count": unavailable})
    print(f"Results saved to {RESULTS_PATH}")


if __name__ == "__main__":
    asyncio.run(evaluate())
