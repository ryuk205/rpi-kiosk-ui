import urllib.request
import json
import sys

BASE_URL = "http://localhost:8000"

def test_endpoint(name, url):
    print(f"Testing {name} ({url})...", end=" ")
    try:
        with urllib.request.urlopen(f"{BASE_URL}{url}") as response:
            if response.status == 200:
                print("OK")
                data = response.read()
                # Try JSON
                try:
                    return json.loads(data)
                except:
                    return data
            else:
                print(f"FAILED ({response.status})")
                return None
    except Exception as e:
        print(f"ERROR: {e}")
        return None

def verify():
    # 1. Message
    msg = test_endpoint("Message", "/api/message")
    if msg and isinstance(msg, dict):
        print(f"  -> Content: {msg.get('content', '')[:50]}...")

    # 2. Playlist
    playlist_data = test_endpoint("Playlist", "/api/screensaver/playlist")
    if playlist_data and isinstance(playlist_data, dict):
        files = playlist_data.get("playlist", [])
        print(f"  -> Found {len(files)} items.")
        
        if len(files) > 0:
            first_file = files[0]
            print(f"  -> Testing Stream: {first_file['url']}")
            # 3. Stream
            stream = test_endpoint("Media Stream", first_file['url'])
            if stream:
                print(f"  -> Stream Size: {len(stream)} bytes")
        else:
            print("  -> WARN: No media files found to test stream.")

if __name__ == "__main__":
    verify()
