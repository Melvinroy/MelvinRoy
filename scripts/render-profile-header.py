"""Render the profile's 3D cortical surface, then encode a GitHub-compatible GIF.

Usage: python scripts/render-profile-header.py [--poster-only]
Dependencies and geometry attribution are documented in assets/CREDITS.md.
The model rotates in 3D under fixed studio lights; this is not a 2D image spin.
"""

from __future__ import annotations

import argparse
import ctypes
import importlib.util
import math
import subprocess
import tempfile
from pathlib import Path

import nibabel as nib
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import vtk
from vtk.util.numpy_support import numpy_to_vtk, numpy_to_vtkIdTypeArray, vtk_to_numpy


ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 1200, 420
MODEL_SIZE = 640
FRAME_COUNT = 240
FRAME_MS = 50


def geometry() -> vtk.vtkPolyData:
    """Load the two fsaverage5 pial hemispheres bundled with Nilearn."""
    spec = importlib.util.find_spec("nilearn")
    data = Path(spec.origin).parent / "datasets/data/fsaverage5"
    surfaces = []
    for side in ("left", "right"):
        coords, faces = nib.load(data / f"pial_{side}.gii.gz").agg_data()
        coords = coords.astype(np.float64) - np.array([0, -18, 15])
        points = vtk.vtkPoints()
        points.SetData(numpy_to_vtk(coords, deep=True))
        cells = vtk.vtkCellArray()
        packed = np.column_stack([np.full(len(faces), 3), faces]).astype(np.int64)
        cells.ImportLegacyFormat(numpy_to_vtkIdTypeArray(packed.ravel(), deep=True))
        mesh = vtk.vtkPolyData()
        mesh.SetPoints(points)
        mesh.SetPolys(cells)
        surfaces.append(mesh)

    append = vtk.vtkAppendPolyData()
    for mesh in surfaces:
        append.AddInputData(mesh)
    subdivide = vtk.vtkLoopSubdivisionFilter()
    subdivide.SetInputConnection(append.GetOutputPort())
    subdivide.SetNumberOfSubdivisions(1)
    normals = vtk.vtkPolyDataNormals()
    normals.SetInputConnection(subdivide.GetOutputPort())
    normals.SplittingOff()
    normals.ConsistencyOn()
    normals.AutoOrientNormalsOn()
    normals.Update()
    return normals.GetOutput()


def setup_scene(build_dir: Path):
    mesh = geometry()
    coords = vtk_to_numpy(mesh.GetPoints().GetData()).copy()
    normals = vtk_to_numpy(mesh.GetPointData().GetNormals()).copy()
    faces = np.ascontiguousarray(vtk_to_numpy(mesh.GetPolys().GetConnectivityArray()).reshape(-1, 3), dtype=np.int32)
    library = build_dir / "profile-rasterizer.so"
    subprocess.run(["g++", "-O3", "-shared", "-fPIC", "-std=c++17", str(ROOT / "scripts/profile-rasterizer.cpp"), "-o", str(library)], check=True)
    native = ctypes.CDLL(str(library)).render_surface
    float_ptr = np.ctypeslib.ndpointer(dtype=np.float32, flags="C_CONTIGUOUS")
    int_ptr = np.ctypeslib.ndpointer(dtype=np.int32, flags="C_CONTIGUOUS")
    byte_ptr = np.ctypeslib.ndpointer(dtype=np.uint8, flags="C_CONTIGUOUS")
    native.argtypes = [float_ptr, float_ptr, int_ptr, ctypes.c_int, float_ptr, ctypes.c_int, ctypes.c_float, byte_ptr]
    native.restype = None
    view = np.array([240., 350., 180.])
    view /= np.linalg.norm(view)
    right = np.cross([0., 0., 1.], view)
    right /= np.linalg.norm(right)
    up = np.cross(view, right)
    basis = np.array([right, up, view])
    lights = []
    for xyz, strength in [((-240, 120, 350), 1.18), ((280, 250, 50), .32), ((-80, -300, 180), .82)]:
        direction = np.array(xyz, dtype=float)
        direction /= np.linalg.norm(direction)
        lights.append([*(basis @ direction), strength])
    lights = np.array(lights, dtype=np.float32)

    def render(angle):
        a = math.radians(angle)
        rotation = np.array([[math.cos(a), -math.sin(a), 0], [math.sin(a), math.cos(a), 0], [0, 0, 1]])
        transform = basis @ rotation
        points = coords @ transform.T
        projected_normals = np.ascontiguousarray(normals @ transform.T, dtype=np.float32)
        scale = MODEL_SIZE / 238
        points[:, 0] = MODEL_SIZE / 2 + points[:, 0] * scale
        points[:, 1] = MODEL_SIZE / 2 - points[:, 1] * scale
        points = np.ascontiguousarray(points, dtype=np.float32)
        pixels = np.empty((MODEL_SIZE, MODEL_SIZE), dtype=np.uint8)
        native(points, projected_normals, faces, len(faces), lights, MODEL_SIZE, scale, pixels)
        return Image.fromarray(pixels).convert("RGB")

    return render


def font(size: int, bold=False, mono=False):
    folder = Path("/usr/share/fonts/opentype/urw-base35")
    name = "NimbusMonoPS-Regular.otf" if mono else "NimbusSans-Bold.otf" if bold else "NimbusSans-Regular.otf"
    path = folder / name
    if not path.exists():
        path = Path("/usr/share/fonts/truetype/dejavu") / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")
    return ImageFont.truetype(str(path), size)


def tracked(draw, position, text, face, fill, spacing=3):
    x, y = position
    for letter in text:
        draw.text((x, y), letter, font=face, fill=fill)
        x += draw.textlength(letter, font=face) + spacing


def compose(brain: Image.Image) -> Image.Image:
    canvas = Image.new("RGB", (WIDTH, HEIGHT), "white")
    # The studio render is square; an unobstructed 3D silhouette sits on the right.
    brain = brain.resize((440, 440), Image.Resampling.LANCZOS)
    canvas.paste(brain, (734, -22))
    draw = ImageDraw.Draw(canvas)
    tracked(draw, (34, 35), "SYSTEMS / PRODUCTS / APPLIED AI", font(17, mono=True), "#616161", spacing=1.5)
    draw.text((28, 113), "Melvin Roy", font=font(96, bold=True), fill="#121212")
    draw.text((34, 245), "I like turning ideas into things that work.", font=font(28), fill="#505050")
    draw.line((34, 343, 140, 343), fill="#1a1a1a", width=2)
    tracked(draw, (162, 333), "LLM WORKFLOWS  /  ORCHESTRATION  /  EVALUATION", font(14, mono=True), "#626262", spacing=0.2)
    return canvas


def compose_mobile(brain: Image.Image) -> Image.Image:
    canvas = Image.new("RGB", (640, 580), "white")
    brain = brain.resize((420, 420), Image.Resampling.LANCZOS)
    canvas.paste(brain, (110, -35))
    draw = ImageDraw.Draw(canvas)
    draw.text((32, 358), "Melvin Roy", font=font(76, bold=True), fill="#121212")
    draw.text((36, 462), "I like turning ideas into", font=font(27), fill="#505050")
    draw.text((36, 499), "things that work.", font=font(27), fill="#505050")
    return canvas


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--poster-only", action="store_true")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "assets")
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    temporary_build = tempfile.TemporaryDirectory(prefix="profile-render-")
    render = setup_scene(Path(temporary_build.name))
    frames = []
    mobile_frames = []
    palette = Image.new("P", (1, 1))
    palette.putpalette([value for value in range(256) for _ in range(3)])
    count = 1 if args.poster_only else FRAME_COUNT
    for index in range(count):
        # Equal angular steps, with no duplicated final frame: a seamless 12s turn.
        brain = render(index * 360 / FRAME_COUNT)
        frame = compose(brain)
        mobile = compose_mobile(brain)
        if index == 0:
            frame.save(args.output_dir / "profile-header.png", optimize=True)
            mobile.save(args.output_dir / "profile-header-mobile.png", optimize=True)
        if index in (0, 60, 120, 180):
            print(f"Rendered angle {index * 360 / FRAME_COUNT:.0f} degrees", flush=True)
        frames.append(frame.quantize(palette=palette, dither=Image.Dither.NONE))
        mobile_frames.append(mobile.quantize(palette=palette, dither=Image.Dither.NONE))
    if not args.poster_only:
        frames[0].save(args.output_dir / "profile-header.gif", save_all=True, append_images=frames[1:], duration=FRAME_MS, loop=0, optimize=True, disposal=1)
        mobile_frames[0].save(args.output_dir / "profile-header-mobile.gif", save_all=True, append_images=mobile_frames[1:], duration=FRAME_MS, loop=0, optimize=True, disposal=1)
        for name, sequence in [("profile-header", frames), ("profile-header-mobile", mobile_frames)]:
            rgb = [frame.convert("RGB") for frame in sequence]
            rgb[0].save(args.output_dir / f"{name}.webp", save_all=True, append_images=rgb[1:], duration=FRAME_MS, loop=0, quality=84, method=5)
        print(f"Saved {FRAME_COUNT} frames; {FRAME_COUNT * FRAME_MS / 1000:g}s loop", flush=True)
    temporary_build.cleanup()


if __name__ == "__main__":
    main()
