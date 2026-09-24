from pydantic import BaseModel
from typing import Optional

class GuideMatchInput(BaseModel):
    city: str
    maxBudget: Optional[str] = None
