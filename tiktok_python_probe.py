import asyncio
import json
import sys

from TikTokLive import TikTokLiveClient
from TikTokLive.events import CommentEvent, ConnectEvent, DisconnectEvent, GiftEvent, LikeEvent


USERNAME = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
CONNECT_RETRIES = 3
RETRY_DELAY_SECONDS = 4


def emit(kind, data=None):
    print(json.dumps({"kind": kind, "data": data or {}}, ensure_ascii=False), flush=True)


def clean_user(user):
    avatar = first_value(
        user,
        "avatar_thumb",
        "avatar_medium",
        "avatar_large",
        "avatarThumb",
        "avatarMedium",
        "avatarLarge",
        "profile_picture",
        "profilePicture",
    )
    return {
        "uniqueId": getattr(user, "unique_id", None),
        "nickname": getattr(user, "nickname", None),
        "userId": getattr(user, "id", None),
        "avatar": avatar,
    }


def first_value(obj, *names):
    for name in names:
        value = getattr(obj, name, None)
        normalized = normalize_avatar(value)
        if normalized:
            return normalized
    return None


def normalize_avatar(value):
    if not value:
        return None
    if isinstance(value, str):
        return value
    for attr in ("url_list", "urlList", "urls", "m_urls"):
        urls = getattr(value, attr, None)
        if urls:
            return list(urls)[0]
    for attr in ("uri", "url"):
        url = getattr(value, attr, None)
        if url:
            return url
    if isinstance(value, dict):
        for key in ("url_list", "urlList", "urls", "m_urls"):
            urls = value.get(key)
            if urls:
                return urls[0]
        return value.get("uri") or value.get("url")
    return None


async def main():
    if not USERNAME:
        emit("error", {"message": "Hãy nhập username TikTok"})
        return 2

    unique_id = USERNAME if USERNAME.startswith("@") else f"@{USERNAME}"
    client = TikTokLiveClient(unique_id=unique_id)

    @client.on(ConnectEvent)
    async def on_connect(event: ConnectEvent):
        emit("connected", {"username": unique_id, "roomId": getattr(event, "room_id", None)})

    @client.on(DisconnectEvent)
    async def on_disconnect(event: DisconnectEvent):
        emit("disconnected", {"username": unique_id})

    @client.on(CommentEvent)
    async def on_comment(event: CommentEvent):
        emit("chat", {
            "comment": event.comment,
            "user": clean_user(event.user),
        })

    @client.on(GiftEvent)
    async def on_gift(event: GiftEvent):
        if getattr(event.gift, "type", None) == 1 and not getattr(event, "repeat_end", True):
            return
        emit("gift", {
            "giftName": getattr(event.gift, "name", None),
            "giftId": getattr(event.gift, "id", None),
            "diamondCount": getattr(event.gift, "diamond_count", None),
            "repeatCount": getattr(event, "repeat_count", 1) or 1,
            "repeatEnd": getattr(event, "repeat_end", None),
            "user": clean_user(event.user),
        })

    @client.on(LikeEvent)
    async def on_like(event: LikeEvent):
        emit("like", {
            "count": getattr(event, "count", None),
            "total": getattr(event, "total", None),
            "user": clean_user(event.user),
        })

    emit("connecting", {
        "username": unique_id,
        "retries": CONNECT_RETRIES,
    })
    last_error = None
    for attempt in range(1, CONNECT_RETRIES + 1):
        try:
            if attempt > 1:
                emit("retrying", {"attempt": attempt, "maxAttempts": CONNECT_RETRIES})
            await client.connect(fetch_live_check=True, process_connect_events=False)
            return 0
        except Exception as error:
            last_error = error
            if attempt >= CONNECT_RETRIES:
                raise
            emit("connect_error", {
                "attempt": attempt,
                "message": f"{type(error).__name__}: {error}",
                "retryInSeconds": RETRY_DELAY_SECONDS,
            })
            await asyncio.sleep(RETRY_DELAY_SECONDS)
    if last_error:
        raise last_error
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(asyncio.run(main()))
    except KeyboardInterrupt:
        emit("manual_disconnect")
    except Exception as error:
        emit("error", {"message": f"{type(error).__name__}: {error}"})
        raise SystemExit(1)
