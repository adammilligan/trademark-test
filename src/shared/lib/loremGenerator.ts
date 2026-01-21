const BASE_WORDS = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
  'incididunt',
  'ut',
  'labore',
  'et',
  'dolore',
  'magna',
  'aliqua',
  'ut',
  'enim',
  'ad',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'nisi',
  'ut',
  'aliquip',
  'ex',
  'ea',
  'commodo',
  'consequat',
  'duis',
  'aute',
  'irure',
  'dolor',
  'in',
  'reprehenderit',
  'in',
  'voluptate',
  'velit',
  'esse',
  'cillum',
  'dolore',
  'eu',
  'fugiat',
  'nulla',
  'pariatur',
  'excepteur',
  'sint',
  'occaecat',
  'cupidatat',
  'non',
  'proident',
  'sunt',
  'in',
  'culpa',
  'qui',
  'officia',
  'deserunt',
  'mollit',
  'anim',
  'id',
  'est',
  'laborum',
]

export const buildWordChunk = (size: number, startIndex: number): string => {
  const words: string[] = []

  for (let index = 0; index < size; index += 1) {
    const word = BASE_WORDS[(startIndex + index) % BASE_WORDS.length]
    words.push(word)
  }

  return words.join(' ')
}

export const seedHistorySamples = (count: number): string[] => {
  const result: string[] = []

  for (let index = 0; index < count; index += 1) {
    const chunk = buildWordChunk(36 + (index % 5) * 4, index * 3)
    result.push(chunk)
  }

  return result
}

