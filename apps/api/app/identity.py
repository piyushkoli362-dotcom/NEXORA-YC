"""Identity adapter boundary for a future audited OIDC integration.

Provider callbacks must validate PKCE, state, nonce, issuer and audience. Verified
email alone must never automatically link an existing privileged account.
"""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class ExternalIdentity:
    issuer: str
    subject: str
    email: str
    email_verified: bool


class OIDCProvider(Protocol):
    def authorization_url(self, *, state: str, nonce: str, code_challenge: str) -> str: ...
    async def exchange(
        self, *, code: str, code_verifier: str, expected_nonce: str
    ) -> ExternalIdentity: ...
