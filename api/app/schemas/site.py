import ipaddress
from pydantic import BaseModel, HttpUrl, field_validator
from typing import Optional
from datetime import datetime

BLOCKED_HOSTNAME_SUFFIXES = ("localhost", ".local", ".internal")


class SiteCreate(BaseModel):
    url: HttpUrl
    name: str
    check_interval_seconds: int = 60

    @field_validator("url")
    @classmethod
    def blockInternalHosts(cls, value: HttpUrl) -> HttpUrl:
        host = (value.host or "").lower()
        if any(host == suffix.lstrip(".") or host.endswith(suffix) for suffix in BLOCKED_HOSTNAME_SUFFIXES):
            raise ValueError("url must not point to a local/internal host")
        bareHost = host[1:-1] if host.startswith("[") and host.endswith("]") else host
        try:
            ip = ipaddress.ip_address(bareHost)
        except ValueError:
            ip = None
        if ip is not None and (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved):
            raise ValueError("url must not point to a private/internal IP address")
        return value


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