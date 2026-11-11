import { Box3, type InstancedMesh, type Mesh, type Object3D } from 'three'

const tmp = new Box3()

/**
 * 物件在世界坐标里的包围盒。跳过 userData.editorIgnore 的子树
 * （比如城市窗外那几层每帧变形的投影平面，算进来会让拖动范围和重叠检测失效）。
 */
export function boundsOf(obj: Object3D, target = new Box3()) {
  target.makeEmpty()
  obj.updateWorldMatrix(true, true)
  const visit = (o: Object3D) => {
    if (o.userData.editorIgnore) return
    const mesh = o as Mesh & Partial<InstancedMesh>
    if (mesh.isMesh) {
      if (mesh.isInstancedMesh) {
        ;(mesh as InstancedMesh).computeBoundingBox()
        tmp.copy((mesh as InstancedMesh).boundingBox!)
      } else {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
        tmp.copy(mesh.geometry.boundingBox!)
      }
      tmp.applyMatrix4(mesh.matrixWorld)
      target.union(tmp)
    }
    for (const c of o.children) visit(c)
  }
  visit(obj)
  return target
}
