"""
rate_limiter.py

Token-bucket rate limiter + retry z exponential backoff dla wywołań OpenAQ API.

Użycie:
    from services.rate_limiter import rate_limited_get

    data = rate_limited_get(url, params=..., headers=...)
"""

import time
import threading
import logging
from typing import Optional

import requests
from requests import Response

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────
# Token Bucket
# ─────────────────────────────────────────

class TokenBucket:
    """
    Klasyczny token bucket — ogranicza liczbę requestów na sekundę.

    Domyślnie: 5 req/s z możliwością krótkiego burstu do 10.
    OpenAQ v3 pozwala ok. 10 req/s dla klucza darmowego.
    """

    def __init__(self, rate: float = 5.0, capacity: float = 10.0):
        self.rate = rate          # tokeny/s (steady-state throughput)
        self.capacity = capacity  # max burst
        self._tokens = capacity
        self._last = time.monotonic()
        self._lock = threading.Lock()

    def acquire(self, timeout: float = 30.0) -> bool:
        deadline = time.monotonic() + timeout
        while True:
            with self._lock:
                now = time.monotonic()
                elapsed = now - self._last
                self._tokens = min(self.capacity, self._tokens + elapsed * self.rate)
                self._last = now

                if self._tokens >= 1.0:
                    self._tokens -= 1.0
                    return True

                wait = (1.0 - self._tokens) / self.rate

            if time.monotonic() + wait > deadline:
                return False
            time.sleep(min(wait, 0.1))


# Globalny bucket — współdzielony przez wszystkie wywołania w procesie
_bucket = TokenBucket(rate=5.0, capacity=10.0)


# ─────────────────────────────────────────
# Retry z exponential backoff
# ─────────────────────────────────────────

def rate_limited_get(
    url: str,
    params: Optional[dict] = None,
    headers: Optional[dict] = None,
    timeout: int = 15,
    max_retries: int = 5,
    backoff_base: float = 2.0,
    backoff_max: float = 60.0,
) -> Response:
    """
    Wykonuje GET z:
      - token-bucket rate limiting (max 5 req/s)
      - automatycznym retry przy 429 / 5xx / błędach sieci
      - exponential backoff: 2s, 4s, 8s, 16s, 32s (max 60s)

    Rzuca ostatni wyjątek jeśli wszystkie próby się nie powiodą.
    """
    last_exc: Exception = RuntimeError("Nieznany błąd")

    for attempt in range(max_retries):
        # Poczekaj na token
        if not _bucket.acquire(timeout=60.0):
            raise TimeoutError("Rate limiter: timeout oczekiwania na token")

        try:
            resp = requests.get(url, params=params, headers=headers, timeout=timeout)

            # 429 Too Many Requests — respektuj Retry-After jeśli jest
            if resp.status_code == 429:
                retry_after = float(resp.headers.get("Retry-After", 0))
                wait = max(retry_after, backoff_base ** attempt)
                wait = min(wait, backoff_max)
                logger.warning(
                    "OpenAQ 429 Too Many Requests — czekam %.1fs (próba %d/%d)",
                    wait, attempt + 1, max_retries
                )
                time.sleep(wait)
                continue

            # 5xx — błąd serwera, warto spróbować ponownie
            if resp.status_code >= 500:
                wait = min(backoff_base ** attempt, backoff_max)
                logger.warning(
                    "OpenAQ %d Server Error — czekam %.1fs (próba %d/%d)",
                    resp.status_code, wait, attempt + 1, max_retries
                )
                time.sleep(wait)
                last_exc = requests.HTTPError(response=resp)
                continue

            # 4xx (poza 429) — nie ma sensu retry
            resp.raise_for_status()
            return resp

        except requests.exceptions.ConnectionError as e:
            wait = min(backoff_base ** attempt, backoff_max)
            logger.warning(
                "OpenAQ ConnectionError: %s — czekam %.1fs (próba %d/%d)",
                e, wait, attempt + 1, max_retries
            )
            last_exc = e
            time.sleep(wait)

        except requests.exceptions.Timeout as e:
            wait = min(backoff_base ** attempt, backoff_max)
            logger.warning(
                "OpenAQ Timeout — czekam %.1fs (próba %d/%d)",
                wait, attempt + 1, max_retries
            )
            last_exc = e
            time.sleep(wait)

        except requests.exceptions.HTTPError as e:
            # 4xx inne niż 429 — nie ponawiaj
            raise

    raise last_exc
