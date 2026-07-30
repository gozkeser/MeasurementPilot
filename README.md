# MeasurementPilot — PCB Inspection & Measurement Flight Record System

> **Version**: 1.0.0  
> **Backend**: Python 3.11+ / FastAPI / Uvicorn  
> **Frontend**: HTML5 / CSS3 / ES2022 JavaScript (Vanilla, Zero Build Steps)

---

## 🌟 Overview

MeasurementPilot is an interactive offline-first PCB inspection, test point definition, and measurement flight record system. It bridges design data (Altium PPL components, TPR test points) with bench execution, providing animated dual-probe visualization on HTML5 Canvas and automated HTML report generation.

---

## ✨ Features

- 🎯 **Interactive Canvas Engine**: High-performance pan, zoom, coordinate mapping, and minimap navigation.
- ⚡ **Fly-to Animations**: Smooth easing navigation to target components, test points, or custom coordinates.
- 🔴🟢 **Animated Dual Probe Visualization**: Realistic Bézier cable droop, metallic probe tip positioning, and tilt angles for positive/negative measurement points.
- 🛠️ **Custom Test Points (CTP)**: Click anywhere on the PCB to define and save CTPs directly into the project ZIP.
- 📋 **Test Case Definition (TCD)**: Organize measurement sequences, expected ranges, unit auto-suggestions, and drag & drop reordering.
- 🚀 **Measurement Execution**: Record measurements with automatic pass/fail validation against expected bounds, skip steps, and track progress.
- 📄 **HTML Flight Records**: Generate standalone offline Jinja2 HTML flight report records.
- 🎨 **Multi-Theme UI**: Dark, Light, and Corporate glassmorphism themes with internationalization (English & Turkish).

---

## 🚀 Quick Start

### 1. Prerequisites

- Python 3.11 or higher
- `pip` package manager

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run Server

```bash
python run.py
```

Open your browser and navigate to:
```
http://localhost:8765
```

---

## 🌐 LAN Deployment

To share MeasurementPilot across a local area network (LAN) for lab operators:

```bash
python run.py --host 0.0.0.0 --port 8765
```

Access from any network device at `http://<server-ip>:8765`.

---

## 📁 Project Structure

```
MeasurementPilot/
├── backend/
│   ├── main.py                  # FastAPI app & static file mount
│   ├── config.py                # System paths & directory configuration
│   ├── routers/                 # REST API endpoints (project, components, ctps, tcd, measurement, report, settings)
│   ├── services/                # Business logic (parsers, transform math, ZIP management, session recording)
│   ├── models/                  # Pydantic data schemas
│   └── templates/               # Jinja2 HTML report templates
├── frontend/
│   ├── index.html               # Main SPA layout shell
│   ├── css/                     # CSS variables, layout, components, and themes
│   ├── js/                      # JS modules (CanvasEngine, Minimap, ProbeAssembly, panels)
├── data/                        # Persisted settings and measurement session files
├── tests/                       # Automated pytest suite & sample project fixtures
├── requirements.txt
├── run.py                       # Server launcher
└── README.md
```

---

## 🧪 Running Unit Tests

Run the full automated test suite with:

```bash
python -m pytest
```

---

## 📄 License

Internal Tool — Confidential & Proprietary.
