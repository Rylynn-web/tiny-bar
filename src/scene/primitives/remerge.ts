import { createContext, useContext, useLayoutEffect } from 'react'

/** 晚到的内容（异步加载的模型）挂上之后调用它，让所在的 MergeStatic 重新合并一次 */
export const RemergeContext = createContext<() => void>(() => {})

/** 异步加载的组件在挂上时调用：通知外层 MergeStatic 把新零件也合并进来 */
export function useRequestRemerge() {
  const request = useContext(RemergeContext)
  useLayoutEffect(() => request(), [request])
}
