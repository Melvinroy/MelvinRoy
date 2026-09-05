# About the profile animation

The header is a custom 3D render of both hemispheres of the **FreeSurfer fsaverage5 cortical surface**, distributed with [Nilearn](https://nilearn.github.io/stable/modules/generated/nilearn.datasets.fetch_surf_fsaverage.html). The source mesh has 10,242 vertices per hemisphere. It is a standard average brain template.

The geometry is centered and smoothed with one Loop subdivision. A small CPU renderer produces the rotation with interpolated surface normals, three fixed lights, and ambient occlusion. The typography, composition, lighting, and animation are created for this profile. These are modified visualizations of the template, not the original FreeSurfer data files.

- [FreeSurfer fsaverage background](https://surfer.nmr.mgh.harvard.edu/fswiki/FsAverage)
- [Geometry license and required notice](FREESURFER-LICENSE.txt)
- Fischl B, Sereno MI, Tootell RBH, Dale AM. *High-resolution intersubject averaging and a coordinate system for the cortical surface.* Human Brain Mapping, 1999. [DOI](https://doi.org/10.1002/(SICI)1097-0193(1999)8:4%3C272::AID-HBM10%3E3.0.CO;2-4)

## Rendering

The committed animations play directly in GitHub Markdown. WebP is preferred for a smaller download, with GIF fallbacks. The full turn is 12 seconds at 20 frames per second. A separate portrait composition supports small screens, and PNG posters are supplied for reduced-motion preferences. The animation does not fetch remote assets, execute browser scripts, or depend on a scheduled service.

To regenerate on Linux with Python 3.12, a C++17 compiler (`g++`), and either Nimbus Sans or DejaVu Sans fonts:

```bash
python -m venv .venv-render
.venv-render/bin/pip install -r scripts/profile-render-requirements.txt
.venv-render/bin/python scripts/render-profile-header.py
```

Use `--poster-only` for a quick lighting and layout check. Use `--output-dir /path/to/output` to render elsewhere. The compiled renderer is temporary; only source code and final assets belong in this repository. An OpenGL installation or display server is not required.

Source: [render-profile-header.py](../scripts/render-profile-header.py) and [profile-rasterizer.cpp](../scripts/profile-rasterizer.cpp).
