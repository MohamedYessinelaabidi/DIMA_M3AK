"""Small SQLite persistence layer for anonymous aggregates and local demo records."""
from __future__ import annotations
import json, os, sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any

DEFAULT_DB=Path(__file__).resolve().parents[2]/'data'/'ergo_predict.sqlite3'
class SQLiteStore:
    def __init__(self,path:str|Path|None=None):
        self.path=Path(path or os.getenv('ERGO_PREDICT_DB_PATH',DEFAULT_DB)).expanduser()
        self.path.parent.mkdir(parents=True,exist_ok=True)
        self.initialize()
    def connect(self):
        db=sqlite3.connect(self.path,timeout=5)
        db.row_factory=sqlite3.Row
        return db
    @contextmanager
    def session(self):
        db=self.connect()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
    def initialize(self):
        with self.session() as db:
            db.executescript('''
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS worker_feedback (
              id TEXT PRIMARY KEY, workstation_id TEXT NOT NULL, anonymous_id TEXT NOT NULL,
              body_zone TEXT NOT NULL, side TEXT NOT NULL, discomfort INTEGER NOT NULL CHECK(discomfort BETWEEN 0 AND 10),
              task_id TEXT NOT NULL, timestamp TEXT NOT NULL, duration TEXT, comment TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_feedback_station ON worker_feedback(workstation_id);
            CREATE TABLE IF NOT EXISTS interventions (
              id TEXT PRIMARY KEY, workstation_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_interventions_station ON interventions(workstation_id);
            CREATE TABLE IF NOT EXISTS assessments (
              id TEXT PRIMARY KEY, workstation_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_assessments_station ON assessments(workstation_id);
            ''')
    def health(self):
        try:
            with self.session() as db: db.execute('SELECT 1').fetchone()
            return {'status':'ok'}
        except sqlite3.Error: return {'status':'error'}
    def add_feedback(self,item:dict[str,Any]):
        with self.session() as db:
            db.execute('INSERT INTO worker_feedback(id,workstation_id,anonymous_id,body_zone,side,discomfort,task_id,timestamp,duration,comment) VALUES(?,?,?,?,?,?,?,?,?,?)',
              (item['id'],item['workstationId'],item['anonymousId'],item['bodyZone'],item['side'],item['discomfort'],item['taskId'],item['timestamp'],item.get('duration'),item.get('comment')))
        return item
    def feedback(self,workstation_id:str):
        with self.session() as db: rows=db.execute('SELECT * FROM worker_feedback WHERE workstation_id=? ORDER BY timestamp',(workstation_id,)).fetchall()
        return [dict(r) for r in rows]
    def add_json(self,table:str,item:dict[str,Any]):
        if table not in {'interventions','assessments'}: raise ValueError('Unsupported table')
        with self.session() as db: db.execute(f'INSERT INTO {table}(id,workstation_id,payload) VALUES(?,?,?)',(item['id'],item['workstationId'],json.dumps(item,allow_nan=False)))
        return item
    def list_json(self,table:str,workstation_id:str):
        if table not in {'interventions','assessments'}: raise ValueError('Unsupported table')
        with self.session() as db: rows=db.execute(f'SELECT payload FROM {table} WHERE workstation_id=? ORDER BY created_at DESC',(workstation_id,)).fetchall()
        return [json.loads(row['payload']) for row in rows]
