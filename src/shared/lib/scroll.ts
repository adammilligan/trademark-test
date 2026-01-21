/**
 * Проверяет, находится ли элемент прокрутки близко к нижней границе
 * @param element - прокручиваемый HTML-элемент
 * @param threshold - пороговое расстояние от низа в пикселях
 */
export const isNearBottom = (
  element: HTMLElement,
  threshold: number,
): boolean => {
  const remaining = element.scrollHeight - element.scrollTop - element.clientHeight
  return remaining <= threshold
}

