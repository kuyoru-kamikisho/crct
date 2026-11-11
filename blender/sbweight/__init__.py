# -*- coding: utf-8 -*-
bl_info = {
    "name": "SBWeight - Bone Bounding Box Weights",
    "author": "sbweight",
    "version": (1, 0, 0),
    "blender": (4, 2, 0),
    "location": "View3D > Sidebar > SBWeight",
    "description": "Fast bone weight painting via proxy bounding-box empties",
    "category": "Rigging",
    "doc_url": "",
    "tracker_url": "",
}

from . import handlers
from . import operators
from . import panels
from . import properties


def register():
    properties.register()
    operators.register()
    panels.register()
    handlers.register()


def unregister():
    handlers.unregister()
    panels.unregister()
    operators.unregister()
    properties.unregister()


if __name__ == "__main__":
    register()
