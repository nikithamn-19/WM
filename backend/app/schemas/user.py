from pydantic import BaseModel
from typing import Optional, List

class PreferencesInput(BaseModel):
    age: Optional[int] = None
    languages: Optional[List[str]] = None # BCP-47 tags e.g. ["en", "hi", "kn"]
    interests: Optional[List[str]] = None # e.g. ["trekking", "food", "heritage"]
    hashtags: Optional[List[str]] = None # e.g. ["#adventure", "#beach"]
    preferredMode: Optional[str] = None # 'Mode A' | 'Mode NA'
    tripTypePreference: Optional[str] = None # 'solo' | 'group' | 'both'
    sameAgeGroupOnly: Optional[bool] = None
    furtherPreferences: Optional[str] = None
    pace: Optional[str] = None
    maxDailyBudget: Optional[float] = None

class ProfileUpdateInput(BaseModel):
    displayName: Optional[str] = None
    travelStyle: Optional[str] = None
    budgetBand: Optional[str] = None
    homeCityId: Optional[str] = None
    avatarUrl: Optional[str] = None
    bio: Optional[str] = None

class RegisterInput(BaseModel):
    displayName: str
    email: str
    password: Optional[str] = None
    age: Optional[int] = None
    languages: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    pace: Optional[str] = None

class LoginInput(BaseModel):
    email: str
    password: Optional[str] = None

