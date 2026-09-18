"""Blender-only release hygiene; no rendering or geometry/material changes.
Usage: blender --factory-startup --background --disable-autoexec path.blend --python tools/sanitize_blend.py
Changes only absolute render output / file browser directory metadata. Saves the
loaded file in place; callers must keep a backup. Does not save user preferences.
"""
from pathlib import Path
import hashlib
import json
import bpy

def fingerprint():
    # Scene/model datablocks before/after: metadata cleanup must not touch them.
    obj=[(o.name,o.type,tuple(tuple(row) for row in o.matrix_world)) for o in bpy.data.objects]
    mesh=[(m.name,[tuple(v.co) for v in m.vertices],[tuple(p.vertices) for p in m.polygons]) for m in bpy.data.meshes]
    mats=[(m.name,[(n.name,n.type) for n in m.node_tree.nodes] if m.node_tree else []) for m in bpy.data.materials]
    return hashlib.sha256(json.dumps([obj,mesh,mats],sort_keys=True).encode()).hexdigest()

before=fingerprint();filename=bpy.data.filepath
if not filename: raise RuntimeError('Load a saved project first')
for scene in bpy.data.scenes:
    name=Path(scene.render.filepath).name
    if not name: raise RuntimeError('Missing render basename')
    scene.render.filepath='//../../assets/scenes/'+name
for screen in bpy.data.screens:
    for area in screen.areas:
        for space in area.spaces:
            if space.type=='FILE_BROWSER' and space.params: space.params.directory=b'//'
bpy.context.preferences.filepaths.save_version=0
assert fingerprint()==before,'Unexpected scene changes'
bpy.ops.wm.save_as_mainfile(filepath=filename,compress=True,check_existing=False)
print('FREEZE_SANITIZED: metadata only; model fingerprint unchanged:',before)
