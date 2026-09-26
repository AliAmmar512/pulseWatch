from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime


class SiteCreate(BaseModel):
    url: HttpUrl
    name: str
    check_interval_seconds: int = 60


class SiteUpdate(BaseModel):
    name: Optional[str] = None
    check_interval_seconds: Optional[int] = None
    is_active: Optional[bool] = None


class SiteOut(BaseModel):
    id: str
    url: str
    name: str
    check_interval_seconds: int
    is_active: bool
    created_at: datetime