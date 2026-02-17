# OCR Rescue Prompt

Improve extraction quality from noisy OCR snippets.

Input:
- page blocks with text, bbox, confidence

Output:
- corrected blocks preserving original bbox where possible
- confidence should decrease when uncertain

Never hallucinate values not present in OCR text.
