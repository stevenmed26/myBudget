# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY apps/api/go.mod apps/api/go.sum* ./apps/api/
WORKDIR /app/apps/api
RUN go mod download

WORKDIR /app
COPY apps/api ./apps/api

WORKDIR /app/apps/api
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /mybudget-api ./cmd/api

# Runtime stage
FROM alpine:3.20

WORKDIR /app

RUN adduser -D -g '' appuser
USER appuser

COPY --from=builder /mybudget-api /usr/local/bin/mybudget-api
COPY db ./db

EXPOSE 8080

CMD ["mybudget-api"]
