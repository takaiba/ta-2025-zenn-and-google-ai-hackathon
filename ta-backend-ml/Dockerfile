# Multi-stage build for optimized image
FROM python:3.11-slim as builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir prisma

# Production image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1-mesa-dev \
    libpq5 \
    poppler-utils \
    wget \
    wkhtmltopdf \
    make \
    curl \
    # Playwrightの依存関係
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libatspi2.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libxcb1 \
    libxkbcommon0 \
    libgtk-3-0 \
    libpango-1.0-0 \
    libcairo2 \
    libgdk-pixbuf2.0-0 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/* \
    && wget "https://github.com/JohannesKaufmann/html-to-markdown/releases/download/v2.1.0/html-to-markdown_Linux_x86_64.tar.gz" -O html-to-markdown_Linux_x86_64.tar.gz \
    && tar -xvf html-to-markdown_Linux_x86_64.tar.gz \
    && mv html2markdown /usr/local/bin \
    && rm html-to-markdown_Linux_x86_64.tar.gz

# Copy Python dependencies from builder first
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin/ /usr/local/bin/

# Install Playwright and browsers
RUN pip install playwright==1.40.0 && \
    playwright install chromium && \
    playwright install-deps chromium

# Copy application source code
COPY . /app

# Create necessary directories
RUN mkdir -p /app/logs /app/project/logs /app/project/staticfiles

# Generate Prisma client
RUN prisma generate

# Copy and set permissions for entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=project.settings
ENV DATABASE_ROOT_URL="postgresql://user:password@localhost:5432/db"
ENV SECRET_KEY="django-insecure-default-key-change-in-production"
ENV DEBUG="True"
ENV OPENAI_API_KEY=""
ENV SENTRY_DSN=""
ENV DOCKER_CONTAINER="1"

# Expose ports
EXPOSE 8000 5555

# Set entrypoint
ENTRYPOINT ["/bin/bash", "/app/docker-entrypoint.sh"]

# Default command
CMD ["web"]