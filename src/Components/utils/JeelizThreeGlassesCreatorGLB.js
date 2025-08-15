/*
  Build 3D glasses from a single GLB model.
  spec properties: 
     * <string> envMapURL: url of the envMap (optional)
     * <string> glassesURL: url of the single combined GLB
     * <string> occluderURL: url of the occluder GLB
*/

const JeelizThreeGlassesCreatorGLB = function (spec) {
  return new Promise((resolve, reject) => {
    const threeGlassesGroup = new THREE.Object3D();

    // Load environment map if provided
    let textureEquirec = null;
    if (spec.envMapURL) {
      textureEquirec = new THREE.TextureLoader().load(spec.envMapURL);
      textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
      textureEquirec.magFilter = THREE.LinearFilter;
      textureEquirec.minFilter = THREE.LinearMipMapLinearFilter;
    }

    const gltfLoader = new THREE.GLTFLoader();

    // Load combined glasses GLB model
    gltfLoader.load(
      spec.glassesURL,
      (gltf) => {
        const model = gltf.scene;

        // Try to get named parts (optional)
        const frames = model.getObjectByName("frames");
        const lenses = model.getObjectByName("lenses");

        if (frames) threeGlassesGroup.add(frames);
        if (lenses) threeGlassesGroup.add(lenses);

        if (!frames && !lenses) {
          // If no named parts, add whole model
          threeGlassesGroup.add(model);
        }

        // Load occluder GLB
        gltfLoader.load(
          spec.occluderURL,
          (occluderGltf) => {
            const occluderMesh = occluderGltf.scene;
            occluderMesh.traverse((child) => {
              if (child.isMesh) {
                child.material = new THREE.MeshBasicMaterial({
                  colorWrite: false,
                });
                child.renderOrder = -1;
              }
            });
            resolve({
              glasses: threeGlassesGroup,
              occluder: occluderMesh,
            });
          },
          undefined,
          (err) => {
            console.error("Failed to load occluder:", err);
            reject(err);
          }
        );
      },
      undefined,
      (err) => {
        console.error("Failed to load glasses model:", err);
        reject(err);
      }
    );
  });
};

export default JeelizThreeGlassesCreatorGLB;
