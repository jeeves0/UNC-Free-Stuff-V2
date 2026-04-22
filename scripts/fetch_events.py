import requests
import json
import time
from datetime import datetime, timedelta

SEARCH_KEYWORDS = [
    "free food",
    "free pizza",
    "free snacks",
    "free lunch",
    "free dinner",
    "free breakfast",
    "free t-shirt",
    "free merch",
    "free merchandise",
    "giveaway",
    "free swag",
    "refreshments",
    "tabling",
]

BASE_URL      = "https://events.unc.edu/api/2/events"
DAYS_AHEAD    = 60
REQUEST_DELAY = 0.75

HEADERS = {
    "User-Agent": "UNC-Free-Stuff-Finder/1.0 (informational/educational use)",
    "Accept":     "application/json",
}


def fetch_events_for_keyword(keyword):
    events = []
    page   = 1

    while True:
        params = {
            "pp":      100,
            "page":    page,
            "keyword": keyword,
            "start":   datetime.now().strftime("%Y-%m-%d"),
            "end":     (datetime.now() + timedelta(days=DAYS_AHEAD)).strftime("%Y-%m-%d"),
        }

        try:
            response = requests.get(
                BASE_URL, params=params, headers=HEADERS, timeout=15
            )
            response.raise_for_status()

            content_type = response.headers.get("Content-Type", "")
            if "json" not in content_type:
                print(f"  Unexpected content-type '{content_type}' for '{keyword}' — skipping")
                break

            data  = response.json()
            batch = data.get("events", [])

            if not batch:
                break

            events.extend(batch)

            meta        = data.get("meta", {})
            total_pages = meta.get("total_pages", 1)
            print(f"  Page {page}/{total_pages} — {len(batch)} results")

            if page >= total_pages:
                break

            page += 1
            time.sleep(0.25)

        except requests.exceptions.Timeout:
            print(f"  Timeout on '{keyword}' page {page} — moving on")
            break
        except requests.exceptions.HTTPError as e:
            print(f"  HTTP {e.response.status_code} for '{keyword}' — moving on")
            break
        except requests.exceptions.RequestException as e:
            print(f"  Network error for '{keyword}': {e}")
            break
        except (json.JSONDecodeError, ValueError) as e:
            print(f"  JSON parse error for '{keyword}': {e}")
            break

    return events


def parse_event(event_wrapper):
    if not isinstance(event_wrapper, dict):
        return None

    event = event_wrapper.get("event")
    if not isinstance(event, dict):
        return None

    photo_data = event.get("photo")
    if isinstance(photo_data, dict):
        photo_url = photo_data.get("url", "")
    else:
        photo_url = event.get("photo_url", "")

    instances = event.get("event_instances", [])
    start = end = None
    all_day = False

    if isinstance(instances, list) and instances:
        first = instances[0]
        if isinstance(first, dict):
            instance = first.get("event_instance", {})
            if isinstance(instance, dict):
                start   = instance.get("start")
                end     = instance.get("end")
                all_day = bool(instance.get("all_day", False))

    raw_tags = event.get("tags", [])
    tags = []
    if isinstance(raw_tags, list):
        for t in raw_tags:
            if isinstance(t, dict):
                tag_obj = t.get("tag", {})
                name = tag_obj.get("name", "") if isinstance(tag_obj, dict) else ""
                if name:
                    tags.append(name)

    return {
        "id":          event.get("id"),
        "title":       event.get("title", "Untitled Event"),
        "description": event.get("description_text", ""),
        "start":       start,
        "end":         end,
        "allDay":      all_day,
        "location":    event.get("location_name", ""),
        "url":         event.get("localist_url", ""),
        "photo":       photo_url,
        "tags":        tags,
    }


def main():
    print(f"Starting event fetch — {datetime.now().isoformat()}\n")
    all_events = {}

    for keyword in SEARCH_KEYWORDS:
        print(f"Searching: '{keyword}' …")
        raw = fetch_events_for_keyword(keyword)
        print(f"  → {len(raw)} raw results\n")

        for wrapper in raw:
            parsed = parse_event(wrapper)
            if parsed and parsed["id"] and parsed["start"]:
                all_events[parsed["id"]] = parsed

        time.sleep(REQUEST_DELAY)

    events_list = sorted(
        all_events.values(),
        key=lambda e: e.get("start") or ""
    )

    output = {
        "updated": datetime.now().isoformat(),
        "count":   len(events_list),
        "events":  events_list,
    }

    with open("events.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"✓ Done — {len(events_list)} unique events saved to events.json.")


if __name__ == "__main__":
    main()
