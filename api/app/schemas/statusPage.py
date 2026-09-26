from pydantic import BaseModel
from typing import List
from datetime import datetime


class StatusPageCreate(BaseModel):
    slug: str
    site_ids: List[str]


class StatusPageOut(BaseModel):
    id: str
    slug: str
    is_public: bool
    created_at: datetime


class PublicSiteStatus(BaseModel):
    name: str
    current_status: str
    uptime_30d: float | None = None


class PublicStatusPageOut(BaseModel):
    slug: str
    sites: List[PublicSiteStatus]