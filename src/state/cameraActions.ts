// 相机动作的小型事件中转：2D 按钮、双击等可以请求相机动作，而不用拿到相机控制器本身。

type Listener = () => void

const resetListeners = new Set<Listener>()

/** 请求平滑回到默认全景视角 */
export function requestResetView() {
  resetListeners.forEach((l) => l())
}

export function onResetView(listener: Listener) {
  resetListeners.add(listener)
  return () => {
    resetListeners.delete(listener)
  }
}
