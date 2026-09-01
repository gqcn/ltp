FROM python:3.11-slim

WORKDIR /opt/agent
RUN pip install --no-cache-dir tensorboard==2.17.1
COPY agent.py /opt/agent/agent.py
ENTRYPOINT ["python", "/opt/agent/agent.py"]
CMD ["metrics"]
