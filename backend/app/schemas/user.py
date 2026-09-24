from pydantic import BaseModel
from typing import Optional, List

class PreferencesInput(BaseModel):
    age: int
    languages: List[str] # BCP-47 tags e.g. ["en", "hi", "kn"]
    interests: List[str] # e.g. ["trekking", "food", "heritage"]
    pace: Optional[str] = None

class ProfileUpdateInput(BaseModel):
    displayName: Optional[str] = None
    travelStyle: Optional[str] = None
    budgetBand: Optional[str] = None
    homeCityId: Optional[str] = None
