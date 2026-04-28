# HuggingFace Spaces Dockerfile for CyberBench Qwen2.5-3B
# Deploys a Gradio app that loads the fine-tuned Qwen adapter and runs live evals.
#
# HuggingFace Spaces requirements:
#   - Must expose port 7860
#   - CMD must start the app on 0.0.0.0:7860

FROM python:3.11-slim

# System deps
RUN apt-get update && apt-get install -y \
    git \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY requirements_hf.txt .
RUN pip install --no-cache-dir -r requirements_hf.txt

# Copy project code (excluding large model files)
COPY agents/           ./agents/
COPY pipeline/         ./pipeline/
COPY sbert/            ./sbert/
COPY data/             ./data/
COPY qwen_training/    ./qwen_training/
COPY config.py         .
COPY app.py            .

# Download & fine-tune SBERT at build time
RUN python sbert/download_model.py && python sbert/train.py

# HuggingFace Spaces: Gradio must listen on 7860
EXPOSE 7860

ENV GRADIO_SERVER_NAME=0.0.0.0
ENV GRADIO_SERVER_PORT=7860

CMD ["python", "app.py"]
