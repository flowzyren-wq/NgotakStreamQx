#!/usr/bin/env python3
"""
Create no-op stub shared libraries for the CUDA libraries that PyTorch's PyPI
wheels link against, so `import torch` works on a machine with no NVIDIA driver
and no `nvidia-*-cu12` pip packages.

Why this is needed
------------------
The Linux `torch` wheel on PyPI is a CUDA build: `libtorch_python.so` and
`libtorch_cuda.so` have DT_NEEDED entries for `libcudart.so.12`, `libcublas.so.12`,
`libcudnn.so.9`, ... If those files do not exist, `import torch` dies with
`OSError: libcudart.so.12: cannot open shared object file`.  Installing the real
`nvidia-*-cu12` wheels costs ~2.5 GB of downloads for code that will never run on
a CPU-only box.

What this does
--------------
1. collects every undefined `cuda*/cudnn*/cublas*/...` symbol in torch's shared
   libraries,
2. emits one tiny .so per expected SONAME that defines those symbols as no-ops
   (with a linker version script so symbol version lookups match), plus sane
   implementations of the device-probing calls (`cudaGetDeviceCount` -> 0) so
   torch reports "no CUDA" instead of segfaulting,
3. iterates `import torch` until it succeeds, adding any symbol the loader still
   complains about.

Usage:
    python make_cuda_stubs.py --venv /path/to/venv [--out /path/to/cuda-stubs]
    sudo cp /path/to/cuda-stubs/*.so* /usr/local/lib/ && sudo ldconfig
    # or: export LD_LIBRARY_PATH=/path/to/cuda-stubs
"""
from __future__ import annotations

import argparse
import os
import pathlib
import re
import subprocess
import sys

SONAMES = {
    "cudart": "libcudart.so.12",
    "cublasLt": "libcublasLt.so.12",
    "cublas": "libcublas.so.12",
    "cudnn": "libcudnn.so.9",
    "cusparse": "libcusparse.so.12",
    "cufft": "libcufft.so.11",
    "curand": "libcurand.so.10",
    "nccl": "libnccl.so.2",
    "cupti": "libcupti.so.12",
    "nvrtc": "libnvrtc.so.12",
    "nvJitLink": "libnvJitLink.so.12",
}
PREFIXES = [  # checked in order, longest/most specific first
    ("cublasLt", "cublasLt"), ("__cuda", "cudart"), ("cuda", "cudart"),
    ("cudnn", "cudnn"), ("cublas", "cublas"), ("cusparse", "cusparse"),
    ("cufft", "cufft"), ("curand", "curand"), ("nccl", "nccl"),
    ("cupti", "cupti"), ("nvrtc", "nvrtc"), ("nvJitLink", "nvJitLink"),
    ("__nvJitLink", "nvJitLink"), ("nvvm", "nvrtc"), ("__nv", "nvrtc"),
]
KEY_OF_SONAME = {v: k for k, v in SONAMES.items()}

# Hand-written implementations of the entry points torch calls while probing for
# CUDA devices: returning an error code + zero devices keeps torch on the CPU
# path instead of dereferencing whatever a no-op stub left in the return register.
OVERRIDES = {
    "cudart": """
int cudaGetDeviceCount(int *count) { if (count) *count = 0; return 100; }
int cudaGetDevice(int *device) { if (device) *device = 0; return 100; }
int cudaSetDevice(int device) { return 100; }
int cudaGetLastError(void) { return 0; }
const char *cudaGetErrorString(int err) { return "CUDA not available (stub build)"; }
int cudaRuntimeGetVersion(int *v) { if (v) *v = 12000; return 0; }
int cudaDriverGetVersion(int *v) { if (v) *v = 12000; return 0; }
int cudaMemGetInfo(size_t *free_mem, size_t *total_mem) { if (free_mem) *free_mem = 0; if (total_mem) *total_mem = 0; return 100; }
int cudaStreamCreate(void **stream) { if (stream) *stream = 0; return 100; }
int cudaStreamDestroy(void *stream) { return 0; }
int cudaDeviceSynchronize(void) { return 0; }
int cudaFree(void *ptr) { return 0; }
int cudaMalloc(void **ptr, size_t size) { if (ptr) *ptr = 0; return 100; }
int cudaGetDeviceProperties(void *prop, int device) { return 100; }
int cudaDeviceGetAttribute(int *value, int attr, int device) { if (value) *value = 0; return 100; }
""",
    "cudnn": """
size_t cudnnGetVersion(void) { return 90000; }
size_t cudnnGetCudartVersion(void) { return 12000; }
const char *cudnnGetErrorString(int status) { return "cuDNN not available (stub build)"; }
int cudnnCreate(void **handle) { if (handle) *handle = 0; return 1; }
""",
    "cublas": "int cublasCreate_v2(void **handle) { if (handle) *handle = 0; return 1; }\n",
    "cublasLt": "int cublasLtCreate(void **handle) { if (handle) *handle = 0; return 1; }\n",
    "nccl": "int ncclGetVersion(int *version) { if (version) *version = 0; return 1; }\n",
    "nvrtc": 'const char *nvrtcGetErrorString(int result) { return "nvrtc not available (stub build)"; }\n',
}

# filled in by main()
TORCH_LIB: pathlib.Path
TORCH_ROOT: pathlib.Path
OUT: pathlib.Path
PYTHON: str


def route(sym: str) -> str | None:
    for pre, key in PREFIXES:
        if sym.startswith(pre):
            return key
    return None


def _nm(flags: str, paths) -> set[str]:
    """Collect symbol names from `nm` output (both '   U sym' and '0001 T sym')."""
    out: set[str] = set()
    for so in paths:
        try:
            r = subprocess.run(["nm", "-D", flags, str(so)], capture_output=True,
                               text=True, timeout=300)
        except Exception as exc:  # pragma: no cover
            print(f"  nm failed on {so}: {exc}", flush=True)
            continue
        for line in r.stdout.splitlines():
            parts = line.split()
            if len(parts) >= 2:
                out.add(parts[-1].split("@")[0])
    return out


def torch_libs() -> list[pathlib.Path]:
    libs = sorted(TORCH_LIB.glob("*.so"))
    for extra in TORCH_ROOT.glob("_C*.so"):
        libs.append(extra)
    return libs


def build(extra_map: dict[str, set[str]] | None = None) -> list[str]:
    extra_map = extra_map or {}
    undef = _nm("--undefined-only", torch_libs())
    defined = _nm("--defined-only", sorted(TORCH_LIB.glob("*.so")))
    groups = {k: set(extra_map.get(k, set())) for k in SONAMES}
    for sym in undef:
        if sym in defined:
            continue
        key = route(sym)
        if key:
            groups[key].add(sym)

    for key, soname in SONAMES.items():
        overridden = set(re.findall(r"\b(\w+)\s*\(", OVERRIDES.get(key, "")))
        syms = sorted(s for s in groups[key] if s not in overridden)
        body = "\n".join(f"void {s}(void) {{ return; }}"
                         for s in syms if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", s))
        csrc = pathlib.Path(f"/tmp/cuda_stub_{key}.c")
        csrc.write_text("#include <stddef.h>\n/* auto-generated CUDA stubs - never called on CPU */\n"
                        + body + "\n" + OVERRIDES.get(key, ""))
        vmap = pathlib.Path(f"/tmp/cuda_stub_{key}.map")
        vmap.write_text(f"{soname} {{ global: *; }};\n")
        subprocess.run(["gcc", "-shared", "-fPIC", f"-Wl,-soname,{soname}",
                        f"-Wl,--version-script,{vmap}", "-o", str(OUT / soname), str(csrc)],
                       check=True)
        print(f"  {soname}: {len(syms)} stub symbols", flush=True)

    return sorted(undef - defined - {s for g in groups.values() for s in g})


def main() -> int:
    global TORCH_LIB, TORCH_ROOT, OUT, PYTHON
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--venv", required=True, help="venv (or any python prefix) that has torch installed")
    ap.add_argument("--out", default=None, help="where to write the stub libraries")
    args = ap.parse_args()

    TORCH_ROOT = pathlib.Path(args.venv).resolve() / "lib" / "python3.11" / "site-packages" / "torch"
    if not TORCH_ROOT.exists():
        for candidate in (pathlib.Path(args.venv).resolve() / "lib").glob("python*/site-packages/torch"):
            TORCH_ROOT = candidate
            break
    if not TORCH_ROOT.exists():
        print(f"torch not found under {args.venv}", file=sys.stderr)
        return 1
    TORCH_LIB = TORCH_ROOT / "lib"
    OUT = pathlib.Path(args.out or pathlib.Path(args.venv) / ".." / "cuda-stubs").resolve()
    OUT.mkdir(parents=True, exist_ok=True)
    PYTHON = str(pathlib.Path(args.venv).resolve() / "bin" / "python")

    env = dict(os.environ, LD_LIBRARY_PATH=str(OUT))
    extras: dict[str, set[str]] = {}
    for i in range(40):
        print(f"--- round {i} ---", flush=True)
        unrouted = build(extras)
        if unrouted:
            print("  (unrouted undefined symbols, first 10):", unrouted[:10], flush=True)
        r = subprocess.run(
            [PYTHON, "-c",
             "import torch, torch.nn, torch.fft, torchaudio;"
             "print('import ok', torch.__version__, 'cuda:', torch.cuda.is_available())"],
            capture_output=True, text=True, env=env, cwd="/tmp")
        if r.returncode == 0:
            print("SUCCESS:", r.stdout.strip())
            print(f"stub libraries in {OUT}")
            print(f"install them with: sudo cp {OUT}/*.so* /usr/local/lib/ && sudo ldconfig")
            return 0
        match = re.search(r"undefined symbol: (\S+?)(?:, version (\S+?))?[ \n]", r.stderr)
        if not match:
            print("FAILED without an undefined-symbol error:\n", r.stderr[-3000:])
            return 1
        sym, ver = match.group(1), match.group(2)
        key = KEY_OF_SONAME.get(ver) or route(sym)
        if not key:
            print("cannot route symbol", sym, ver)
            return 1
        extras.setdefault(key, set()).add(sym)
        print(f"  adding {sym} -> {SONAMES[key]}", flush=True)
    return 1


if __name__ == "__main__":
    sys.exit(main())
