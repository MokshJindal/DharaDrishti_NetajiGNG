from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

engine = create_engine("sqlite:///fields.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class Field(Base):
    __tablename__ = "fields"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)


class Trace(Base):
    __tablename__ = "traces"
    id = Column(Integer, primary_key=True)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=False)
    kind = Column(String, nullable=False)
    name = Column(String, nullable=False)
    status = Column(String, default="recording")
    area_sqm = Column(Float, nullable=True)
    points = relationship("Point", order_by="Point.timestamp",
                          cascade="all, delete-orphan")


class Point(Base):
    __tablename__ = "points"
    id = Column(Integer, primary_key=True)
    trace_id = Column(Integer, ForeignKey("traces.id"), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    accuracy = Column(Float, default=0)
    timestamp = Column(Float, default=0)


Base.metadata.create_all(engine)