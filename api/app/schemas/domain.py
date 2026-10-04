import re
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date, datetime

FQDN_PATTERN = re.compile(
    r"^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))+$"
)
BLOCKED_DOMAIN_SUFFIXES = ("localhost", ".local", ".internal")


class DomainCreate(BaseModel):
    domain_name: str

    @field_validator("domain_name")
    @classmethod
    def validateDomainName(cls, value: str) -> str:
        normalized = value.strip().lower().rstrip(".")
        if not FQDN_PATTERN.match(normalized):
            raise ValueError("domain_name must be a valid domain name")
        if any(normalized == suffix.lstrip(".") or normalized.endswith(suffix) for suffix in BLOCKED_DOMAIN_SUFFIXES):
            raise ValueError("domain_name must not point to a local/internal host")
        return normalized


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