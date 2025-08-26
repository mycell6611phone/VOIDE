FROM mambaorg/micromamba:1.5.6
USER root
RUN micromamba install -y -n base -c conda-forge python=3.11 faiss-cpu grpcio grpcio-tools uvicorn fastapi && \
    micromamba clean -a -y
WORKDIR /app
COPY proto/ /app/proto
COPY server/ /app/faissd
RUN python -m grpc_tools.protoc -Iproto --python_out=faissd --grpc_python_out=faissd proto/faissd.proto
EXPOSE 50051
CMD ["python", "-m", "faissd.server"]
