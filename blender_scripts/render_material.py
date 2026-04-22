import bpy # type: ignore
import sys
import os

# To run: blender -b -P render_material.py -- /path/to/diffuse.png /path/to/output.png

def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def setup_scene():
    # Camera
    bpy.ops.object.camera_add(location=(2.5, -2.5, 2.5))
    cam = bpy.context.object
    # Point at center (0,0,0)
    import mathutils # type: ignore
    direction = -cam.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam.rotation_euler = rot_quat.to_euler()
    bpy.context.scene.camera = cam

    # Lighting
    bpy.ops.object.light_add(type='POINT', location=(3, 0, 5))
    bpy.context.object.data.energy = 500

    bpy.ops.object.light_add(type='POINT', location=(-3, -3, 3))
    bpy.context.object.data.energy = 300

    # Shader Ball (UV Sphere)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.5, location=(0,0,0), segments=64, ring_count=32)
    bpy.ops.object.shade_smooth()
    return bpy.context.object

import zipfile
import tempfile

def apply_material(obj, diffuse_path):
    mat = bpy.data.materials.new(name="MaterialPreview")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")

    diff_path_to_load = diffuse_path

    if diffuse_path.lower().endswith('.zip'):
        temp_dir = tempfile.mkdtemp()
        try:
            with zipfile.ZipFile(diffuse_path, 'r') as z:
                # Look for diffuse/color image
                found_img = None
                for filename in z.namelist():
                    lower = filename.lower()
                    if ('diff' in lower or 'col' in lower or 'albedo' in lower or 'basecolor' in lower) and \
                       lower.endswith(('.png', '.jpg', '.jpeg')):
                        found_img = filename
                        break
                
                # fallback: just grab the first image
                if not found_img:
                    for filename in z.namelist():
                        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                            found_img = filename
                            break
                            
                if found_img:
                    diff_path_to_load = z.extract(found_img, temp_dir)
        except Exception as e:
            print("Zip error:", e)

    if diff_path_to_load and os.path.exists(diff_path_to_load):
        tex_image = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tex_image.image = bpy.data.images.load(diff_path_to_load)
        mat.node_tree.links.new(bsdf.inputs['Base Color'], tex_image.outputs['Color'])

    obj.data.materials.append(mat)

def render(output_path):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    if bpy.context.preferences.addons['cycles'].preferences.has_active_device():
        scene.cycles.device = 'GPU'
        
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.film_transparent = True
    scene.render.filepath = output_path
    
    bpy.ops.render.render(write_still=True)

if __name__ == "__main__":
    argv = sys.argv
    try:
        index = argv.index('--') + 1
    except ValueError:
        index = len(argv)

    args = argv[index:] # type: ignore
    if len(args) < 2:
        print("Usage: blender -b -P render_material.py -- <diffuse_texture> <output_png>")
        sys.exit(1)

    diffuse_file = args[0]
    output_png = args[1]

    clean_scene()
    ball = setup_scene()
    apply_material(ball, diffuse_file)
    render(output_png)
