from pydantic import BaseModel
from typing import Optional

class GroupMatchInput(BaseModel):
    destination: Optional[str] = None
    dateFilter: Optional[str] = None
    interest: Optional[str] = None
    mode: Optional[str] = None

class GuideMatchInput(BaseModel):
    city: Optional[str] = None
    destination: Optional[str] = None
    maxBudget: Optional[str] = None
    specialisation: Optional[str] = None
    language: Optional[str] = None
    currency: Optional[str] = None
    certifiedOnly: Optional[bool] = False

