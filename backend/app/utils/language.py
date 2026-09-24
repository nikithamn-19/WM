def normalize_bcp47(lang_code: str) -> str:
    """Normalize BCP-47 language codes (e.g. 'en-US' -> 'en-US', 'hi' -> 'hi')"""
    if not lang_code:
        return 'en'
    cleaned = lang_code.strip()
    return cleaned
