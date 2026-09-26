"""
NEW FILE: real system/network monitoring for the Network Sovereignty panel.
Replaces the static `initialNetworkLogs` fixture in the frontend.

Install: pip install psutil
"""

import time
from typing import List, Dict, Any

import psutil
from fastapi import APIRouter

router = APIRouter(prefix="/api/system", tags=["System Monitor"])

# IPs/hosts considered "local" (never counted as external egress)
LOCAL_PREFIXES = ("127.", "0.0.0.0", "::1", "localhost")


def _is_local(ip: str) -> bool:
    return any(ip.startswith(p) for p in LOCAL_PREFIXES)


@router.get("/network")
def get_network_connections() -> Dict[str, Any]:
    """
    Returns real active network connections for this machine right now.
    Classifies each as local (allowed) or external (flagged) so the
    frontend can render a genuinely live sovereignty proof instead of
    a static fixture.
    """
    connections: List[Dict[str, Any]] = []
    total = 0
    local_count = 0
    external_count = 0
    # Monotonic counter for unique IDs — conn.fd is -1 on Windows,
    # so pid+fd cannot be used as a unique key.
    seq = 0
    # Deduplicate by (remote_ip, remote_port, pid) so the same logical
    # connection isn't listed multiple times in the table.
    seen: set = set()

    try:
        for conn in psutil.net_connections(kind="inet"):
            if conn.status not in ("ESTABLISHED", "LISTEN"):
                continue

            raddr = conn.raddr
            laddr = conn.laddr

            dest_ip = f"{raddr.ip}:{raddr.port}" if raddr else (
                f"{laddr.ip}:{laddr.port}" if laddr else "unknown"
            )
            ip_only = raddr.ip if raddr else (laddr.ip if laddr else "0.0.0.0")

            # Skip duplicate rows for the same (destination, pid)
            dedup_key = (dest_ip, conn.pid)
            if dedup_key in seen:
                continue
            seen.add(dedup_key)

            is_external = not _is_local(ip_only) and conn.status == "ESTABLISHED"

            total += 1
            if is_external:
                external_count += 1
            else:
                local_count += 1

            seq += 1
            connections.append({
                "id": f"conn-{conn.pid}-{seq}",
                "pid": conn.pid,
                "destination": dest_ip,
                "status_raw": conn.status,
                "isExternal": is_external,
                "status": "BLOCKED_OR_FLAGGED" if is_external else "ALLOWED_LOCAL",
            })
    except psutil.AccessDenied:
        # On some OSes this needs elevated permissions; report that plainly
        # rather than silently returning fake data.
        return {
            "error": "Access denied reading network connections. "
                     "Try running the backend with elevated/admin privileges.",
            "total_connections": 0,
            "local_count": 0,
            "external_count": 0,
            "connections": [],
            "timestamp": time.time(),
        }

    return {
        "total_connections": total,
        "local_count": local_count,
        "external_count": external_count,
        "connections": connections[-50:],  # most recent 50
        "timestamp": time.time(),
    }
