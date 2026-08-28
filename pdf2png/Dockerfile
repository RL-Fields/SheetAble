# syntax=docker/dockerfile:1

# python:3.8-slim-buster was on Debian Buster, which is now end-of-life -
# its apt mirrors are gone, so `apt-get update` 404s. Bookworm is current
# stable and still gets security updates.
FROM python:3.11-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Debian's system Python is "externally managed" as of Bookworm - this is a
# single-purpose container with nothing else installed, so --break-system-packages
# is safe here (no risk of clobbering an OS-managed package).
RUN pip3 install --no-cache-dir --break-system-packages flask pdf2image

COPY . .

CMD [ "python3", "-m" , "flask", "run", "--host=0.0.0.0"]
