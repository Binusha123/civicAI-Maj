import base64
import io
import json
import logging
import math
import re
import time
from typing import Any, Dict, List, Literal
from urllib.parse import quote

import httpx
import imagehash
from PIL import Image
from pydantic import BaseModel, Field, field_validator

from app.core.config import settings

logger = logging.getLogger(__name__)

CATEGORIES = [
    "Road Damage",
    "Garbage & Sanitation",
    "Water Issues",
    "Electricity Hazards",
    "None",
]
IMAGE_TYPES = ["real_photo", "screenshot_or_stock", "illustration_or_render", "indoor_or_irrelevant"]
AUTHENTICITIES = ["likely_genuine", "uncertain", "likely_synthetic"]
SEVERITIES = ["None", "Low", "Medium", "High", "Critical"]
DESCRIPTION_ASSESSMENTS = ["consistent", "contradicted", "uncertain"]

RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "issue_visible": {"type": "BOOLEAN"},
        "detected_category": {"type": "STRING", "enum": CATEGORIES},
        "description_assessment": {"type": "STRING", "enum": DESCRIPTION_ASSESSMENTS},
        "description_observation": {"type": "STRING"},
        "image_type": {"type": "STRING", "enum": IMAGE_TYPES},
        "authenticity": {"type": "STRING", "enum": AUTHENTICITIES},
        "authenticity_signals": {"type": "ARRAY", "items": {"type": "STRING"}},
        "severity": {"type": "STRING", "enum": SEVERITIES},
        "flags": {"type": "ARRAY", "items": {"type": "STRING"}},
        "confidence": {"type": "NUMBER"},
        "summary": {"type": "STRING"},
    },
    "required": [
        "issue_visible",
        "detected_category",
        "description_assessment",
        "description_observation",
        "image_type",
        "authenticity",
        "authenticity_signals",
        "severity",
        "flags",
        "confidence",
        "summary",
    ],
    "propertyOrdering": [
        "issue_visible",
        "detected_category",
        "description_assessment",
        "description_observation",
        "image_type",
        "authenticity",
        "authenticity_signals",
        "severity",
        "flags",
        "confidence",
        "summary",
    ],
}


class AnalysisResult(BaseModel):
    issue_visible: bool
    detected_category: Literal[
        "Road Damage",
        "Garbage & Sanitation",
        "Water Issues",
        "Electricity Hazards",
        "None",
    ]
    description_assessment: Literal["consistent", "contradicted", "uncertain"]
    description_observation: str
    image_type: Literal["real_photo", "screenshot_or_stock", "illustration_or_render", "indoor_or_irrelevant"]
    authenticity: Literal["likely_genuine", "uncertain", "likely_synthetic"]
    authenticity_signals: List[str] = Field(default_factory=list)
    severity: Literal["None", "Low", "Medium", "High", "Critical"]
    flags: List[str] = Field(default_factory=list)
    confidence: float
    summary: str

    @field_validator("confidence", mode="before")
    @classmethod
    def clamp_confidence(cls, value: Any) -> float:
        confidence = float(value)
        if not math.isfinite(confidence):
            raise ValueError("confidence_score must be finite")
        return max(0.0, min(1.0, confidence))

    @field_validator("flags")
    @classmethod
    def validate_flags(cls, flags: List[str]) -> List[str]:
        for flag in flags:
            if not re.fullmatch(r"[a-z][a-z0-9_]{0,39}", flag):
                raise ValueError("flags must be short snake_case tags")
        return flags

    @field_validator("summary")
    @classmethod
    def validate_summary(cls, summary: str) -> str:
        summary = " ".join(summary.split())
        if not summary:
            raise ValueError("summary cannot be empty")
        sentence_endings = re.findall(r"[.!?](?:\s|$)", summary)
        if len(sentence_endings) > 1:
            raise ValueError("summary must be one sentence")
        if not sentence_endings:
            summary += "."
        return summary


class AIService:
    async def analyze_image(self, image_path: str, category: str, description: str | None = None) -> Dict[str, Any]:
        started_at = time.perf_counter()
        detected = "None"
        confidence = 0.0

        try:
            if not settings.AI_API_KEY or not settings.AI_MODEL:
                raise RuntimeError("Gemini API key or model is not configured")

            image_bytes = self._prepare_image(image_path)
            prompt = self._build_prompt(category, description)
            model = quote(settings.AI_MODEL, safe="")
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {
                                "inlineData": {
                                    "mimeType": "image/jpeg",
                                    "data": base64.b64encode(image_bytes).decode("ascii"),
                                }
                            },
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "responseSchema": RESPONSE_SCHEMA,
                    "temperature": 0.1,
                },
            }

            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    endpoint,
                    headers={"x-goog-api-key": settings.AI_API_KEY},
                    json=payload,
                )
            response.raise_for_status()
            response_data = response.json()
            model_text = self._extract_response_text(response_data)
            parsed = json.loads(self._strip_code_fences(model_text))
            analysis = AnalysisResult.model_validate(parsed)
            result = analysis.model_dump()
            result["raw_output"] = parsed
            detected = result["detected_category"]
            confidence = result["confidence"]
            return result
        except Exception as error:
            logger.warning("Gemini analysis unavailable (%s); using mock fallback", type(error).__name__)
            result = self._mock_fallback(category)
            detected = result["detected_category"]
            confidence = result["confidence"]
            return result
        finally:
            elapsed = time.perf_counter() - started_at
            logger.info(
                "AI analysis category=%s detected=%s confidence=%.2f seconds=%.2f",
                category,
                detected,
                confidence,
                elapsed,
            )

    @staticmethod
    def _prepare_image(image_path: str) -> bytes:
        output = io.BytesIO()
        with Image.open(image_path) as image:
            image.thumbnail((1024, 1024))
            image.convert("RGB").save(output, format="JPEG", quality=88, optimize=True)
        return output.getvalue()

    @staticmethod
    def _build_prompt(category: str, description: str | None = None) -> str:
        citizen_description = (description or "").strip() or "No description provided."
        return f"""Act as a careful municipal inspector assessing a citizen-submitted photo.
The citizen-selected category is: {category!r}.
The citizen's description is: {citizen_description!r}.
Categories: Road Damage (potholes, cracks, broken pavement), Garbage & Sanitation (overflowing bins, dumping), Water Issues (pipe leaks, sewage, flooding, contamination), Electricity Hazards (exposed wires, fallen poles, broken streetlights).
Answer ONLY with JSON matching the supplied schema. Describe only visible details. Never invent a problem to match the chosen category.
Compare the citizen's description to the visible image. Set description_assessment to contradicted only when a specific claim is clearly inconsistent with what is visible (for example, claimed potholes but a clearly visible intact road). Set consistent when visible evidence supports the claim. Set uncertain when the relevant area is obscured, distant, dark, blurry, cropped, or otherwise cannot be judged. In description_observation, state briefly what is visible and why it supports, contradicts, or cannot confirm the claim. Do not infer intent or accuse the citizen of dishonesty.
Set issue_visible=false, detected_category=None, severity=None for a normal intact scene with only minor wear, small stains, or ordinary litter, and for irrelevant images such as selfies, posing people, pets, indoor rooms, food, memes, documents, and app or website screenshots.
Classify screenshots or stock photos as screenshot_or_stock; drawings and renders as illustration_or_render; indoor or irrelevant scenes as indoor_or_irrelevant; otherwise use real_photo.
Judge authenticity only from visible evidence. Signals include warped text, impossible geometry or lighting, merged objects, glossy painted appearance, repeated textures, inconsistent shadows, malformed people or vehicles, watermarks, studio composition, or UI borders. Genuine-photo cues include casual framing, phone-camera noise, motion blur, uneven lighting, and ordinary surroundings.
Use uncertain when evidence is unclear; never default to likely_genuine. Use likely_synthetic only when at least two concrete visual signals are present and list them in authenticity_signals. Never call an image fake based on a guess.
Use severity Critical only for immediate danger (live/exposed wires, large sinkholes, deep flooding, collapsed poles). Lower confidence for dark, blurry, tiny, or cropped images. Confidence is from 0 to 1. Flags are short snake_case tags. Summary is one sentence."""

    @staticmethod
    def _extract_response_text(response_data: Dict[str, Any]) -> str:
        candidates = response_data.get("candidates") or []
        if not candidates:
            raise ValueError("Gemini response has no candidates")
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(part.get("text", "") for part in parts if isinstance(part, dict))
        if not text.strip():
            raise ValueError("Gemini response has no text")
        return text

    @staticmethod
    def _strip_code_fences(text: str) -> str:
        text = text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text, count=1, flags=re.IGNORECASE)
            text = re.sub(r"\s*```$", "", text, count=1)
        return text.strip()

    @staticmethod
    def _mock_fallback(category: str) -> Dict[str, Any]:
        valid_category = category in CATEGORIES[:-1]
        severity = "High" if category == "Road Damage" else "Medium"
        detected_category = category if valid_category else "None"
        raw_output = {
            "fallback": "mock",
            "detected_category": detected_category,
            "reason": "AI analysis unavailable",
        }
        return {
            "issue_visible": valid_category,
            "detected_category": detected_category,
            "description_assessment": "uncertain",
            "description_observation": "AI comparison is unavailable; an officer should compare the description and photo.",
            "image_type": "real_photo",
            "authenticity": "uncertain",
            "authenticity_signals": [],
            "confidence": 0.0,
            "severity": severity,
            "flags": ["ai_unavailable"],
            "summary": "AI analysis is unavailable; an officer should review this report.",
            "raw_output": raw_output,
        }

    @staticmethod
    def compute_phash(image_path: str) -> str:
        with Image.open(image_path) as image:
            return str(imagehash.phash(image))


ai_service = AIService()
