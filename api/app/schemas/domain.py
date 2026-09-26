from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class DomainCreate(BaseModel):
    domain_name: str


class DomainOut(BaseModel):
    id: str
    domain_name: str
    created_at: datetime


class DomainDetail(BaseModel):
    id: str
    domain_name: str
    created_at: datetime
    ssl_expiry_date: Optional[date] = None
    ssl_issuer: Optional[str] = None