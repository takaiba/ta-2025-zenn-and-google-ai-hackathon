## Setup with docker

### 1. run container

```
make serve-detached
```



## Setup with venv

### 1. install pre-requisties

- [mise](https://mise.jdx.dev/lang/python.html) for python installer.
- [uv](https://astral.sh/blog/uv) for python package installer.

### 2. install python with mise

```bash
mise install python@3.x.x
```

### 3. create venv with uv

```bash
uv venv
```

### 4. install python packages

```bash
uv pip install -r requirements-dev.txt && uv pip install -r  requirements.txt
```
