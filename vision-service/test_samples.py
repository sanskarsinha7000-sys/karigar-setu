import argparse
import json
import mimetypes
import pathlib
import urllib.request
import uuid


def analyze(path: pathlib.Path, endpoint: str) -> dict:
    boundary = uuid.uuid4().hex
    content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    payload = path.read_bytes()
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{path.name}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode() + payload + f"\r\n--{boundary}--\r\n".encode()
    request = urllib.request.Request(
        endpoint,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(request) as response:
        return json.load(response)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the local vision service against real craft images.")
    parser.add_argument("images", nargs="+", type=pathlib.Path)
    parser.add_argument("--endpoint", default="http://localhost:8000/analyze")
    args = parser.parse_args()
    for image in args.images:
        result = analyze(image, args.endpoint)
        print(json.dumps({"image": image.name, **result}, indent=2))


if __name__ == "__main__":
    main()
