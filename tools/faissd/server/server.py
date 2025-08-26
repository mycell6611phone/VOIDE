import os
import grpc
from concurrent import futures
import numpy as np
import faiss

from . import faissd_pb2, faissd_pb2_grpc

DATA_DIR = os.environ.get("FAISSD_DATA", "/data")
INDEXES = {}

def get_index(path, dim):
  if os.path.exists(path):
    return faiss.read_index(path)
  idx = faiss.IndexFlatIP(dim)
  return idx

class Service(faissd_pb2_grpc.FaissdServicer):
  def __init__(self):
    os.makedirs(DATA_DIR, exist_ok=True)

  def Upsert(self, request, context):
    coll = request.collection
    vecs = request.vectors
    if not vecs:
      return faissd_pb2.UpsertReply(upserted=0)
    dim = len(vecs[0].values)
    p = os.path.join(DATA_DIR, f"{coll}.index")
    idx = INDEXES.get(coll) or get_index(p, dim)
    xb = np.array([v.values for v in vecs], dtype='float32')
    faiss.normalize_L2(xb)
    if not idx.is_trained:
      pass
    idx.add(xb)
    INDEXES[coll] = idx
    faiss.write_index(idx, p)
    return faissd_pb2.UpsertReply(upserted=len(vecs))

  def Query(self, request, context):
    coll = request.collection
    p = os.path.join(DATA_DIR, f"{coll}.index")
    if not os.path.exists(p):
      return faissd_pb2.QueryReply(ids=[], scores=[])
    idx = INDEXES.get(coll) or faiss.read_index(p)
    INDEXES[coll] = idx
    q = np.array([request.query], dtype='float32')
    faiss.normalize_L2(q)
    D, I = idx.search(q, request.top_k or 5)
    ids = [str(int(i)) for i in I[0]]
    scores = [float(d) for d in D[0]]
    return faissd_pb2.QueryReply(ids=ids, scores=scores)

def serve():
  server = grpc.server(futures.ThreadPoolExecutor(max_workers=4))
  faissd_pb2_grpc.add_FaissdServicer_to_server(Service(), server)
  server.add_insecure_port("[::]:50051")
  server.start()
  server.wait_for_termination()

if __name__ == "__main__":
  serve()
