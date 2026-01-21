export const isNearBottom = (
  element: HTMLElement,
  threshold: number,
): boolean => {
  const remaining = element.scrollHeight - element.scrollTop - element.clientHeight
  return remaining <= threshold
}

