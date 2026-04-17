# Use NVIDIA CUDA base image for GPU acceleration support
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

# Suppress interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# OS dependencies for OpenCV, Python
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install standard Python requirements
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Bundle application source
COPY . .

EXPOSE 8000

# Bind mount the Uvicorn host
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
