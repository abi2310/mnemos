# MNEMOS.AI

> Conversational data analysis for tabular datasets: upload data, ask questions in natural language, and receive profiles, charts, dashboards, and AI-assisted analysis results.

[![Backend CI](https://github.com/abi2310/mnemos/actions/workflows/backend_ci.yml/badge.svg)](https://github.com/abi2310/mnemos/actions/workflows/backend_ci.yml)
[![Frontend CI](https://github.com/abi2310/mnemos/actions/workflows/frontend_ci.yml/badge.svg)](https://github.com/abi2310/mnemos/actions/workflows/frontend_ci.yml)

MNEMOS.AI is a full-stack analytics prototype that makes descriptive data analysis accessible through a chat-first workflow. Instead of manually configuring charts in a BI tool, users can upload structured data, inspect and clean it, then ask analytical questions in plain language.

The project combines a React workspace UI with a FastAPI backend, a pandas-based data quality pipeline, and a LangGraph-powered analysis agent that can generate text answers, charts, multi-panel dashboards, and sandboxed Python analysis artifacts.

## Key Features

- Upload and manage tabular datasets (`.csv`, `.xlsx`, `.parquet`, `.json`)
- Automatic data profiling, schema detection, missing-value checks, type inference, and quality reports
- Dataset preview and cleaned-data workflow for preparation tasks
- Project-oriented React workspace with Prepare, Explore, Predict, Datasets, and chat areas
- Conversational analysis agent with clarification and approval gates for ambiguous or sensitive requests
- Deterministic chart rendering with Matplotlib for bar, line, histogram, and scatter plots
- Dashboard generation with multiple rendered chart panels
- Sandboxed execution path for more flexible Python-based analysis
- Persistent chat/message storage via SQLite and SQLModel
- Backend and frontend CI pipelines for linting, tests, and builds

## Architecture

```text
mnemos/
+-- backend/
|   +-- app/
|   |   +-- api/v1/              # FastAPI dataset and chat routes
|   |   +-- graph/               # LangGraph workflow builder and nodes
|   |   +-- models/              # API and database models
|   |   +-- renderers/           # Matplotlib chart rendering
|   |   +-- services/            # Dataset, chat, LLM, storage, pipeline services
|   |   +-- state/               # Workflow state model
|   +-- tests/                   # Unit and integration tests
|   +-- requirements.txt
+-- frontend/
|   +-- public/
|   +-- src/
|   |   +-- components/          # Workspace, chat, datasets, preview, navigation
|   |   +-- services/            # API clients
|   |   +-- utils/               # File parsing utilities
|   +-- package.json
+-- storage/                     # Local dataset/artifact storage
```

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, React Scripts, React Grid Layout, XLSX, Testing Library |
| Backend | Python 3.12, FastAPI, Pydantic, SQLModel, SQLAlchemy, Uvicorn |
| Data | pandas, NumPy, PyArrow, OpenPyXL |
| AI Workflow | LangChain, LangGraph, OpenAI API integration |
| Visualization | Matplotlib, Plotly dependency support |
| Quality | pytest, pytest-cov, Ruff, Black, Jest, GitHub Actions |

## How It Works

1. A user uploads a dataset through the React UI or the dataset API.
2. The backend stores the raw file locally and runs the data quality pipeline.
3. The pipeline creates derived artifacts such as cleaned data and quality reports.
4. In Explore mode, the user opens a chat for a dataset and asks an analytical question.
5. The LangGraph workflow profiles the dataset, interprets intent, asks for clarification when needed, creates an analysis plan, validates output specifications, and renders the final response.
6. Generated chart images are exposed through the FastAPI `/storage` static route and displayed in the frontend chat.

If no `OPENAI_API_KEY` is configured, the backend falls back to heuristic analysis behavior where possible. With an API key, the LLM-powered structured-output path is used.

## Preview

https://github.com/user-attachments/assets/649355b5-24c2-4342-a01a-836ea1b02655


## Getting Started

### Prerequisites

- Python 3.12
- Node.js 18+
- npm
- Optional: OpenAI API key for LLM-backed analysis

### Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Optional `backend/.env`:

```bash
OPENAI_API_KEY=your_api_key_here
```

Start the API:

```bash
python -m app.main
```

The backend runs on:

```text
http://127.0.0.1:8000
```

Useful endpoints:

```text
GET    /
POST   /api/v1/datasets
GET    /api/v1/datasets
GET    /api/v1/datasets/{dataset_id}/preview
GET    /api/v1/datasets/{dataset_id}/quality-report
POST   /api/v1/chats
POST   /api/v1/chats/{chat_id}/messages
GET    /storage/{path}
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend runs on:

```text
http://localhost:3000
```

The frontend currently expects the backend at:

```text
http://localhost:8000/api/v1
```

## Testing and Quality

Backend:

```bash
cd backend
python -m pytest -q
python -m pytest -q --cov=app --cov-report=term-missing
python -m ruff check .
python -m black --check .
```

Frontend:

```bash
cd frontend
npm test -- --watchAll=false
npm run lint
npm run build
```

## Current Status

MNEMOS.AI is an active prototype. The core workflow is implemented end-to-end: dataset upload, profiling, quality reporting, chat persistence, agent orchestration, chart rendering, dashboard artifacts, and frontend workspace navigation.

Some implementation details are intentionally lightweight for prototype speed:

- Dataset metadata is currently kept in memory while uploaded files and artifacts are stored on disk.
- Chat history is persisted in a local SQLite database.
- The frontend project model is local React state and not yet backed by a database.
- Authentication, multi-user isolation, and production deployment hardening are not included yet.

## Why This Project Matters

This project demonstrates practical full-stack engineering across product UI, API design, data processing, automated testing, and LLM orchestration. It is designed as a portfolio-grade implementation of an AI analytics workflow: not just a prompt wrapper, but a structured system with validation, deterministic rendering, storage, CI, and test coverage.
