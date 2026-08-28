# This Dockerfile now builds the frontend AND embeds it (via go.rice) as
# part of the image build, instead of relying on a pre-built rice-box.go
# being checked into git. That previously meant any frontend change silently
# had no effect on a fresh `docker build` unless someone had manually run
# `npm run build` + `rice embed-go` and committed the regenerated file - easy
# to trip over when working on a fork.
#
# Build context must be the REPO ROOT (see docker-compose.yml), because this
# needs both backend/ and frontend/:
#   docker build -f backend/Dockerfile .

# ---- Stage 1: build the React frontend ----
FROM node:18-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: build the Go backend, embedding the built frontend ----
FROM golang:alpine AS builder

RUN apk add --no-cache build-base git

LABEL maintainer="vallezw"

WORKDIR /app/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
# rice.MustFindBox() in api/controllers/routes.go looks for ../../../frontend/build
# (i.e. <repo root>/frontend/build) - so it needs to land at /app/frontend/build.
COPY --from=frontend-builder /frontend/build /app/frontend/build

RUN go install github.com/GeertJohan/go.rice/rice@latest
RUN cd api/controllers && rice embed-go

RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o main .

# ---- Stage 3: runtime image ----
FROM alpine:latest

RUN apk --no-cache add ca-certificates curl

WORKDIR /app/

COPY --from=builder /app/backend/main .

EXPOSE 8080

CMD ["./main"]
