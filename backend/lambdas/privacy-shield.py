"""
=============================================================================
LAMBDA: privacy-shield
Sanitizes extracted contract text for privacy and prepares for analysis
=============================================================================

Trigger: Step Functions (after gemini-text-extractor)
Input: Extracted text from PDF, contractId, bucket, key
Output: Sanitized text, clauses list, contract confidence score

Processing Steps:
  1. Detect and fix reversed text (mirror text from some scanners)
  2. Mask PII (ID numbers, credit cards, phones, emails, bank accounts)
  3. Remove OCR noise (scanner watermarks, special characters)
  4. Split text into clauses for display
  5. Calculate contract confidence score

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import re
import json
import logging

# =============================================================================
# CONFIGURATION
# =============================================================================

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Patterns for detecting and masking PII (Personally Identifiable Information)
# NOTE: Replacement strings are in Hebrew because they appear in the displayed contract text
PII_PATTERNS = {
    'israeli_id': (re.compile(r'\b[0-9]{8,9}\b'), '[ת.ז. הוסתר]'),
    'credit_card': (re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'), '[כ.אשראי הוסתר]'),
    'phone_mobile': (re.compile(r'\b05\d[-\s]?\d{3}[-\s]?\d{4}\b'), '[נייד הוסתר]'),
    'email': (re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'), '[אימייל הוסתר]'),
    'bank_account': (re.compile(r'\b\d{2,3}[-\s]?\d{3}[-\s]?\d{6,9}\b'), '[חשבון בנק הוסתר]'),
}

# Patterns for cleaning OCR scanner noise
OCR_NOISE_PATTERNS = [
    re.compile(r'(?i)scanned with camscanner.*'),
    re.compile(r'(?i)www\.camscanner\.com'),
    re.compile(r'[\u2000-\u200f]'),  # Hidden directional characters
    re.compile(r'[|~^§`®©™]'),       # Special characters (usually OCR errors)
    re.compile(r'[_]{3,}'),          # Long underlines
]

# Keywords for text direction detection (normal vs. reversed)
KEYWORDS_NORMAL = ['חוזה', 'הסכם', 'שכירות', 'משכיר', 'שוכר', 'דירה']
KEYWORDS_REVERSED = ['הזוח', 'םכסה', 'תוריכש', 'ריכשמ', 'רכוש', 'הריד']

# Keywords for contract confidence scoring
CONTRACT_KEYWORDS = [
    ('חוזה שכירות', 20), ('הסכם שכירות', 20),
    ('המשכיר', 10), ('משגיר', 10), ('בעל הדירה', 10),
    ('השוכר', 10), ('השובר', 10),
    ('דמי שכירות', 15), ('תשלום חודשי', 10),
    ('תקופת השכירות', 10), ('תקופת האופציה', 5),
    ('פינוי', 5), ('ערבות', 5), ('צ\'ק ביטחון', 5),
    ('בלתי מוגנת', 10)
]

# Section headers commonly found in rental contracts
SECTION_HEADERS = [
    'מבוא', 'הואיל', 'לפיכך',
    'תקופת השכירות', 'תקופת האופציה', 'הארכת החוזה',
    'דמי השכירות', 'דמי שכירות', 'תשלומים',
    'מיסים, אגרות ותשלומים', 'מיסים ותשלומים',
    'השימוש והחזקה', 'השימוש במושכר', 'החזקת המושכר',
    'אחריות לנזק', 'אחריות', 'נזקים',
    'פינוי המושכר', 'פינוי הדירה', 'פינוי',
    'בטחונות', 'ערבויות', 'ערבות', 'ביטחונות',
    'הפרות', 'הפרה יסודית', 'ביטול ההסכם',
    'שונות', 'הוראות כלליות', 'כללי',
    'חתימות', 'חתימה',
]

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def detect_and_fix_direction(text: str) -> str:
    """
    Detects if text is reversed (mirror text) and fixes it.
    Some scanners produce reversed Hebrew text.
    
    Args:
        text: Raw extracted text
    
    Returns:
        str: Corrected text (reversed if needed)
    """
    score_normal = sum(1 for word in KEYWORDS_NORMAL if word in text)
    score_reversed = sum(1 for word in KEYWORDS_REVERSED if word in text)
    
    if score_reversed > score_normal:
        logger.info(f"Reversed text detected (Score: {score_reversed} vs {score_normal}). Fixing...")
        fixed_lines = [line[::-1] for line in text.split('\n')]
        return '\n'.join(fixed_lines)
    
    return text


def sanitize_pii(text: str) -> tuple[str, list[str]]:
    """
    Masks personally identifiable information in text.
    
    Args:
        text: Text containing potential PII
    
    Returns:
        tuple: (sanitized text, list of PII types found)
    """
    pii_found = []
    for pii_type, (pattern, replacement) in PII_PATTERNS.items():
        if pattern.search(text):
            pii_found.append(pii_type)
            text = pattern.sub(replacement, text)
    return text, pii_found


def clean_ocr_noise(text: str) -> str:
    """
    Removes scanner app watermarks and OCR artifacts.
    
    Args:
        text: Text with potential OCR noise
    
    Returns:
        str: Cleaned text
    """
    for pattern in OCR_NOISE_PATTERNS:
        text = pattern.sub(' ', text)
    
    # Collapse multiple spaces and empty lines
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
    return text.strip()


def split_to_clauses(text: str) -> list[str]:
    """
    Splits contract text into individual clauses for display.
    
    Identifies:
    - Section headers (common rental contract sections)
    - Numbered clauses (1., 2., etc.)
    - Hebrew letter clauses (א., ב., etc.)
    
    Avoids splitting on:
    - Money amounts (5,200 NIS)
    - Dates (26.10.25)
    
    Args:
        text: Full contract text
    
    Returns:
        list: Individual clauses
    """
    # Regex for clause numbers (not money or dates)
    CLAUSE_NUMBER_PATTERN = re.compile(
        r'(?:^|(?<=\s)|(?<=\n))'
        r'([0-9]{1,2}|[א-י])'
        r'[.\)]\s+'
        r'(?![0-9,]+\s*(?:ש[״\']?ח|₪|שקל|אלף))'
        r'(?![0-9]{1,2}[./][0-9])'
    )
    
    lines = text.split('\n')
    clauses = []
    current_clause = ""
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        is_header = any(header in line for header in SECTION_HEADERS)
        is_numbered_clause = bool(CLAUSE_NUMBER_PATTERN.match(line))
        is_new_clause = is_header or is_numbered_clause
        
        if is_new_clause:
            if current_clause and len(current_clause.strip()) > 15:
                clauses.append(current_clause.strip())
            current_clause = line
        else:
            if current_clause:
                current_clause += " " + line
            else:
                current_clause = line
    
    if current_clause and len(current_clause.strip()) > 15:
        clauses.append(current_clause.strip())
    
    # Pattern to split multiple clauses on the same line
    # Matches: space + digit(s) + period + space, but NOT money or dates
    #   (?<=\S)\s+             - After non-whitespace, then whitespace
    #   ([0-9]{1,2})\.\s+      - Number + period + space
    #   (?![0-9,]+...)         - NOT followed by money amounts
    #   (?=[\u0590-\u05FF])    - MUST be followed by Hebrew letter
    split_pattern = re.compile(
        r'(?<=\S)\s+'
        r'([0-9]{1,2})\.\s+'
        r'(?![0-9,]+\s*(?:ש[״\']?ח|₪))'
        r'(?![0-9]{1,2}[./][0-9])'
        r'(?=[\u0590-\u05FF])'
    )
    
    final_clauses = []  # Initialize final_clauses list
    
    for clause in clauses:
        split_points = [(m.start(), m.group(1)) for m in split_pattern.finditer(clause)]
        
        if split_points:
            prev_pos = 0
            for pos, num in split_points:
                sub_clause = clause[prev_pos:pos].strip()
                if len(sub_clause) > 15:
                    final_clauses.append(sub_clause)
                prev_pos = pos + 1
            last_part = clause[prev_pos:].strip()
            if len(last_part) > 15:
                final_clauses.append(last_part)
        else:
            if len(clause) > 15:
                final_clauses.append(clause)
    
    # Final cleanup
    cleaned = []
    for clause in final_clauses:
        clause = re.sub(r'\s+', ' ', clause).strip()
        if not re.match(r'^[\d\W]+$', clause):
            cleaned.append(clause)
    
    return cleaned


def calculate_contract_confidence(text: str) -> int:
    """
    Calculates confidence score that the text is a rental contract.
    
    Args:
        text: Contract text
    
    Returns:
        int: Confidence score (0-100)
    """
    score = 0
    text_lower = text.lower()
    
    for keyword, weight in CONTRACT_KEYWORDS:
        if keyword in text or keyword in text_lower:
            score += weight
            
    return min(100, score)

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - sanitizes extracted contract text.
    
    Args:
        event: Step Functions event with extractedText, contractId, bucket, key
        context: AWS Lambda context object
    
    Returns:
        dict: Sanitized text, clauses list, confidence score
    """
    try:
        text = event.get('extractedText', '')
        contract_id = event.get('contractId', 'unknown')
        bucket = event.get('bucket')
        key = event.get('key')
        
        logger.info(f"Processing contract {contract_id}, length: {len(text)}")
        
        if not text:
            return {
                'error': 'No text extracted',
                'contractConfidence': 0,
                'sanitizedText': ''
            }
        
        # 1. Fix text direction (reversed text from some scanners)
        text = detect_and_fix_direction(text)

        # 2. Mask PII
        text, pii_found = sanitize_pii(text)
        
        # 3. Clean OCR noise
        text = clean_ocr_noise(text)
        
        # 4. Split into clauses
        clauses_list = split_to_clauses(text)
        
        # 5. Calculate contract confidence
        contract_confidence = calculate_contract_confidence(text)
        logger.info(f"Contract Confidence Score: {contract_confidence}")
        
        return {
            'contractId': contract_id,
            'sanitizedText': text,
            'clauses': clauses_list,
            'contractConfidence': contract_confidence,
            'piiFound': pii_found,
            'bucket': bucket,
            'key': key
        }
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise e