import bpy # type: ignore
import sys
import os

# To run: blender -b -P render_model.py -- /path/to/model.obj /path/to/output.png

def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def setup_camera():
    bpy.ops.object.camera_add(location=(0, 0, 10))
    cam = bpy.context.object
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 5.0
    cam.rotation_euler = (0, 0, 0) # Points down -Z usually if rotated, wait, default camera looks down -Z. Actually, location=(0,0,10) looking down requires rotation.
    cam.rotation_euler[0] = 0 # No, default camera looking -Z is rotation (0,0,0) ? No, default is looking along -Z axis.
    
    bpy.context.scene.camera = cam
    return cam

def setup_lighting():
    bpy.ops.object.light_add(type='SUN', location=(10, 10, 10))
    light = bpy.context.object
    light.data.energy = 2.0

import zipfile
import tempfile

def import_model(filepath):
    ext = os.path.splitext(filepath)[1].lower()
    
    if ext == '.zip':
        temp_dir = tempfile.mkdtemp()
        try:
            with zipfile.ZipFile(filepath, 'r') as z:
                z.extractall(temp_dir)
            
            # Find the first supported 3D model file
            supported_exts = ['.fbx', '.obj', '.dae']
            found_model = False
            for root, dirs, files in os.walk(temp_dir):
                if found_model: break
                for file in files:
                    if os.path.splitext(file)[1].lower() in supported_exts:
                        filepath = os.path.join(root, file)
                        ext = os.path.splitext(filepath)[1].lower()
                        found_model = True
                        break
        except Exception as e:
            print("Zip extraction error:", e)

    if ext == '.obj':
        # Fallback to legacy obj importer if the new one isn't available in this version
        if hasattr(bpy.ops.wm, 'obj_import'):
            bpy.ops.wm.obj_import(filepath=filepath)
        else:
            bpy.ops.import_scene.obj(filepath=filepath)
    elif ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=filepath)
    elif ext == '.dae':
        bpy.ops.wm.collada_import(filepath=filepath)
    else:
        print(f"Unsupported format {ext}")
        sys.exit(1)

    # Frame camera to objects
    bpy.ops.object.select_all(action='SELECT')
    # Actually finding bounding box to set ortho scale
    # But a simple way for top down is to just keep it large enough
    
    # We want top-down. 
    # Usually Z is up in Blender.
    # We place camera at (0,0,10) looking straight down at (0,0,-1)
    # Camera rotation to look straight down:
    # X=0, Y=0, Z=0 means looking down -Z.
    
def setup_freestyle():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.render.use_freestyle = True
    scene.view_layers[0].freestyle_settings.use_smoothness = True
    
    # Enable line art
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.film_transparent = True

def render(output_path):
    bpy.context.scene.render.filepath = output_path
    bpy.ops.render.render(write_still=True)

if __name__ == "__main__":
    argv = sys.argv
    try:
        index = argv.index('--') + 1
    except ValueError:
        index = len(argv)

    args = argv[index:] # type: ignore
    if len(args) < 2:
        print("Usage: blender -b -P render_model.py -- <input_model> <output_png>")
        sys.exit(1)

    input_file = args[0]
    output_png = args[1]

    clean_scene()
    setup_camera()
    setup_lighting()
    import_model(input_file)
    setup_freestyle()
    render(output_png)
    
    print(f"Finished rendering to {output_png}")
