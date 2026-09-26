"""Export the versioned API schema without starting a server."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'apps/api'))
from app.main import app  # noqa: E402

output = ROOT / 'packages/types/openapi.json'
output.write_text(json.dumps(app.openapi(), indent=2) + '\n', encoding='utf-8')
print('Exported packages/types/openapi.json')
