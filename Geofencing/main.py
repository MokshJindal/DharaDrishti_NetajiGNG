from fastapi.responses import FileResponse
import math
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from db import SessionLocal, Field, Trace, Point

app = FastAPI()
MAX_ACCURACY_M = 100


class NewField(BaseModel):
    name: str

class NewTrace(BaseModel):
    field_id: int
    kind: str
    name: str

class GpsPoint(BaseModel):
    lat: float
    lng: float
    accuracy: float
    timestamp: float

class DrawnShape(BaseModel):
    field_id: int
    kind: str
    name: str
    corners: list[list[float]]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def to_meters(coords):
    lat0, lng0 = coords[0]
    meters_per_deg_lat = 110574
    meters_per_deg_lng = 111320 * math.cos(math.radians(lat0))
    return [((lng - lng0) * meters_per_deg_lng,
             (lat - lat0) * meters_per_deg_lat) for lat, lng in coords]

def area_square_meters(xy):
    total = 0
    n = len(xy)
    for i in range(n):
        x1, y1 = xy[i]
        x2, y2 = xy[(i + 1) % n]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2

def area_report(coords):
    area_sqm = area_square_meters(to_meters(coords))
    return {
        "area_sqm": round(area_sqm, 1),
        "area_hectares": round(area_sqm / 10000, 4),
        "area_acres": round(area_sqm / 4046.86, 4),
    }


@app.post("/fields")
def create_field(data: NewField, db=Depends(get_db)):
    field = Field(name=data.name)
    db.add(field)
    db.commit()
    db.refresh(field)
    return {"field_id": field.id}


@app.post("/traces")
def create_trace(data: NewTrace, db=Depends(get_db)):
    if db.get(Field, data.field_id) is None:
        raise HTTPException(404, "Field not found")
    trace = Trace(field_id=data.field_id, kind=data.kind, name=data.name)
    db.add(trace)
    db.commit()
    db.refresh(trace)
    return {"trace_id": trace.id}


@app.post("/traces/{trace_id}/points")
def add_point(trace_id: int, point: GpsPoint, db=Depends(get_db)):
    trace = db.get(Trace, trace_id)
    if trace is None:
        raise HTTPException(404, "Trace not found")
    if trace.status != "recording":
        raise HTTPException(400, "This trace is already finished")
    if point.accuracy > MAX_ACCURACY_M:
        return {"status": "ignored", "reason": "weak GPS"}
    db.add(Point(trace_id=trace_id, lat=point.lat, lng=point.lng,
                 accuracy=point.accuracy, timestamp=point.timestamp))
    db.commit()
    return {"status": "saved"}


@app.post("/traces/{trace_id}/finish")
def finish_trace(trace_id: int, db=Depends(get_db)):
    trace = db.get(Trace, trace_id)
    if trace is None:
        raise HTTPException(404, "Trace not found")
    if len(trace.points) < 3:
        raise HTTPException(400, "Need at least 3 good points")
    coords = [(p.lat, p.lng) for p in trace.points]
    report = area_report(coords)
    trace.status = "finished"
    trace.area_sqm = report["area_sqm"]
    db.commit()
    return {"trace_id": trace.id, "name": trace.name, **report}


@app.post("/shapes")
def save_drawn_shape(shape: DrawnShape, db=Depends(get_db)):
    if db.get(Field, shape.field_id) is None:
        raise HTTPException(404, "Field not found")
    if len(shape.corners) < 3:
        raise HTTPException(400, "Need at least 3 corners")
    trace = Trace(field_id=shape.field_id, kind=shape.kind,
                  name=shape.name, status="finished")
    db.add(trace)
    db.flush()
    for i, (lat, lng) in enumerate(shape.corners):
        db.add(Point(trace_id=trace.id, lat=lat, lng=lng, accuracy=0, timestamp=i))
    report = area_report([tuple(c) for c in shape.corners])
    trace.area_sqm = report["area_sqm"]
    db.commit()
    return {"trace_id": trace.id, "name": trace.name, **report}


@app.get("/fields/{field_id}")
def get_field(field_id: int, db=Depends(get_db)):
    field = db.get(Field, field_id)
    if field is None:
        raise HTTPException(404, "Field not found")
    traces = db.query(Trace).filter(Trace.field_id == field_id).all()
    return {
        "field": field.name,
        "traces": [
            {
                "id": t.id,
                "kind": t.kind,
                "name": t.name,
                "status": t.status,
                "area_sqm": t.area_sqm,
                "points": [[p.lat, p.lng] for p in t.points],
            }
            for t in traces
        ],
    }
@app.get("/")
def home():
    return FileResponse("index.html")